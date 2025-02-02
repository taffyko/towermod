use std::{io::{ErrorKind, Read, Seek}, path::Path};
use async_walkdir::WalkDir;
use futures::StreamExt;
use fs_err::tokio as fs;
use anyhow::{Result, Context};
use zip::ZipArchive;

pub mod ext {
	use std::{io::{ErrorKind, Seek, Write}, path::Path};
	use async_walkdir::WalkDir;
	use futures::{Future, StreamExt};
	use fs_err::tokio as fs;
	use anyhow::{Result, Context};
	use zip::write::{FileOptionExtension, FileOptions};
	use std::sync::Mutex;
	use std::marker::{Send, Sync};

	pub trait ZipWriterExt {
		fn add_file_if_exists<'a, T: FileOptionExtension + Send>(&mut self, input_path: impl AsRef<Path> + Send, options: FileOptions<'a, T>) -> impl Future<Output = Result<()>> + Send;
		fn add_dir_if_exists<'a, T: FileOptionExtension + Send + Sync + Clone>(&mut self, input_path: impl AsRef<Path> + Send, options: FileOptions<'a, T>) -> impl Future<Output = Result<()>> + Send;
		// async fn add_dir<'a, T>(&mut self, input_path: PathBuf, options: FileOptions<'a, T>) -> Result<()>;
	}
	impl<W: Write + Seek + Send> ZipWriterExt for zip::ZipWriter<W> {
		fn add_file_if_exists<'a, T: FileOptionExtension + Send>(&mut self, input_path: impl AsRef<Path> + Send, options: FileOptions<'a, T>) -> impl Future<Output = Result<()>> + Send {
			async move {
				let input_path = input_path.as_ref();
				let bytes = match fs::read(&input_path).await {
					Ok(v) => v,
					Err(e) if e.kind() == ErrorKind::NotFound => return Ok(()),
					Err(e) => Err(e)?,
				};
				self.start_file(input_path.file_name().context("bad filepath")?.to_string_lossy(), options)?;
				self.write_all(&bytes)?;
				Ok(())
			}
		}

		fn add_dir_if_exists<'a, T: FileOptionExtension + Send + Sync + Clone>(&mut self, input_path: impl AsRef<Path> + Send, options: FileOptions<'a, T>) -> impl Future<Output = Result<()>> + Send {
			async move {
				let input_path = input_path.as_ref();
				let zip = Mutex::new(self);
				let stream = WalkDir::new(input_path);
				let path_prefix = input_path.parent().context("bad path")?;
				let results = Mutex::new(Vec::new());
				stream.for_each_concurrent(None, async |entry| {
					let options = options.clone();
					let result: Result<()> = try {
						let entry = match entry {
							Ok(e) => e,
							Err(e) if e.io().is_some() && e.io().unwrap().kind() == ErrorKind::NotFound => return (),
							Err(e) => Err(e)?,
						};
						let meta = entry.metadata().await?;
						if meta.is_file() {
							let path = entry.path();
							let bytes = fs::read(&path).await?;
							let path = path.strip_prefix(&path_prefix)?;
							{
								let mut zip = zip.lock().unwrap();
								zip.start_file_from_path(&path, options)?;
								zip.write_all(&bytes)?;
							}
						}
					};
					results.lock().unwrap().push(result);
				}).await;
				let results = results.into_inner().unwrap();
				for result in results {
					result?
				}
				Ok(())
			}
		}
	}
	pub trait MutexExt<T> {
		fn with_lock<TResult>(&self, f: impl FnMut(&mut T) -> TResult) -> TResult;
	}
	impl<T> MutexExt<T> for std::sync::Mutex<T> {
		fn with_lock<TResult>(&self, mut f: impl FnMut(&mut T) -> TResult) -> TResult {
			let mut inner = self.lock().unwrap();
			f(&mut *inner)
		}
	}
}

pub use ext::*;

pub async fn zip_merge_copy_into<R: Read + Seek>(zip: &mut ZipArchive<R>, src_dir: &str, dst_dir: &Path, replace_existing: bool) -> Result<()> {
	let zip_len = zip.len();
	let stream = futures::stream::iter(0..zip_len);
	let results = std::sync::Mutex::new(vec![]);
	let zip = std::sync::Mutex::new(zip);
	stream.for_each_concurrent(None, async |i: usize| {
		let result: Result<()> = try {
			let mut buf = Vec::new();
			let path = {
				let mut zip = zip.lock().unwrap();
				let mut file = zip.by_index(i)?;
				if !file.is_file() { return; }
				if !file.name().starts_with(&src_dir) { return; }
				let path = file.enclosed_name().context("bad zip entry")?;
				let relative_path = path.strip_prefix(&src_dir)?;
				file.read_to_end(&mut buf)?;
				dst_dir.join(relative_path)
			};
			if replace_existing {
				if let Err(e) = fs::remove_file(&path).await {
					match e.kind() {
						std::io::ErrorKind::NotFound => (),
						_ => {
							Err(e).context(format!("{}", path.display()))?;
						},
					}
				}
				fs::create_dir_all(&path.parent().unwrap()).await?;
				fs::write(&path, &buf).await?;
			} else {
				if !tokio::fs::try_exists(&path).await? {
					fs::create_dir_all(&path.parent().unwrap()).await?;
					fs::write(&path, &buf).await?;
				}
			}
		};
		results.lock().unwrap().push(result);
	}).await;

	let results = results.into_inner().unwrap();
	for result in results {
		result?;
	}

	Ok(())
}

pub async fn merge_copy_into(src_dir: &Path, dst_dir: &Path, use_hardlinks: bool, replace_existing: bool) -> Result<()> {
	if !src_dir.exists() {
		return Ok(())
	}
	if !dst_dir.exists() {
		fs::create_dir_all(dst_dir).await?;
	}

	let same_filesystem = {
		let src_prefix = src_dir.components().next();
		let dst_prefix = dst_dir.components().next();
		src_prefix == dst_prefix
	};

	let stream = WalkDir::new(src_dir);
	stream.for_each_concurrent(None, |entry| async {
		let _: Result<()> = try {
			let entry = entry?;
			let entry_path = entry.path();
			let relative_path = entry_path.strip_prefix(src_dir)?;
			if relative_path.to_string_lossy() == "" {
				return;
			}
			let dest_path = dst_dir.join(relative_path);

			let src_meta = entry.metadata().await?;
			if src_meta.is_dir() {
				fs::create_dir_all(&dest_path).await?;
			} else {
				// Skip if dest already exists and src was not modified more recently
				let exists;
				if let Ok(dest_meta) = fs::metadata(&dest_path).await {
					exists = true;
					if src_meta.modified().unwrap() <= dest_meta.modified().unwrap() {
						return;
					}
				} else {
					exists = false;
				}

				// Skip if not replacing existing files
				if (exists && !replace_existing) {
					return;
				}

				// Remove file if exists
				if !exists {
					if let Err(e) = fs::remove_file(&dest_path).await {
						match e.kind() {
							ErrorKind::NotFound => (),
							_ => Err(e)?,
						}
					};
				}

				// Hardlink file if able and src/dest are on same filesystem
				if use_hardlinks && same_filesystem {
					if let Err(_) = fs::hard_link(&entry_path, &dest_path).await {
						fs::copy(&entry_path, &dest_path).await?;
					}
				} else {
					fs::copy(&entry_path, &dest_path).await?;
				}
			}
		};
	}).await;

	Ok(())
}

pub async fn remove_dir_if_exists(path: impl AsRef<Path>) -> Result<()> {
	let path = path.as_ref();
	match fs::remove_dir_all(path).await {
		Ok(_) => Ok(()),
		Err(e) => match e.kind() {
			ErrorKind::NotFound => Ok(()),
			_ => Err(e)?,
		},
	}
}

pub fn diff(old: &[u8], new: &[u8]) -> Result<Vec<u8>> {
	let mut patch = vec![];
	bidiff::simple_diff(old, new, &mut patch)?;
	Ok(zstd::bulk::compress(&patch, 0)?)
}

pub fn apply_patch(current: &[u8], compressed_patch: &[u8]) -> Result<Vec<u8>> {
	let mut patch = vec![];
	zstd::stream::copy_decode(std::io::Cursor::new(compressed_patch), &mut patch)?;
	let mut reader = bipatch::Reader::new(std::io::Cursor::new(patch), std::io::Cursor::new(current))?;
	let mut patched = vec![];
	std::io::copy(&mut reader, &mut patched)?;
	Ok(patched)
}
