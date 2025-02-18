use std::{collections::HashMap, io::Read, path::{Path, PathBuf}};
use anyhow::{Context, Result};
use futures::StreamExt;
use tokio::sync::RwLock;
use tokio_stream::wrappers::ReadDirStream;
use tracing::instrument;
use towermod_cstc::{self as cstc, ImageBlock, ImageMetadata, ImageResource};

use crate::PeResource;

pub fn create_imageblock_metadata_patch(original_metadata: Vec<ImageMetadata>, new_metadata: Vec<ImageMetadata>) -> Result<Vec<u8>> {
	let original = metadata_into_bin(original_metadata)?;
	let new = metadata_into_bin(new_metadata)?;
	towermod_util::diff(&*original, &*new)
}

pub fn apply_imageblock_metadata_patch(original_metadata: Vec<ImageMetadata>, patch: Vec<u8>) -> Result<Vec<ImageMetadata>> {
	let original = metadata_into_bin(original_metadata)?;
	let new = towermod_util::apply_patch(&*original, &patch)?;
	metadata_from_bin(new)
}

/// ImageBlock bin with empty image payloads, used for creating and applying binary patches to just the metadata
fn metadata_into_bin(metadata: Vec<ImageMetadata>) -> Result<Vec<u8>> {
	let new_image_block: cstc::ImageBlock = metadata.into_iter().map(|m| {
		ImageResource::new(Vec::new(), m)
	}).collect();
	Ok(new_image_block.to_bin()?)
}

fn metadata_from_bin(bin: Vec<u8>) -> Result<Vec<ImageMetadata>> {
	let image_block = cstc::ImageBlock::from_bin(&bin)?;
	Ok(image_block.into_iter().map(|r| r.into()).collect())
}

/// Combine base images, a directory or zip containing custom images, and metadata, to create a patched ImageBlock
pub async fn get_patched_image_block(mut images: HashMap<i32, Vec<u8>>, dir_or_zip: Option<PathBuf>, metadata: Vec<ImageMetadata>) -> Result<ImageBlock> {
	if let Some(dir_or_zip) = dir_or_zip {
		if dir_or_zip.is_dir() {
			images.extend(images_from_dir(dir_or_zip).await?);
		} else {
			images.extend(images_from_zip(dir_or_zip).await?);
		}
	}
	Ok(combine_imageblock(images, metadata))
}

pub fn split_imageblock(image_block: cstc::ImageBlock) -> (HashMap<i32, Vec<u8>>, Vec<ImageMetadata>) {
	let mut metadatas = Vec::with_capacity(image_block.len());
	let mut images = HashMap::with_capacity(image_block.len());
	for image in image_block {
		let (image, metadata) = image.split();
		images.insert(metadata.id, image);
		metadatas.push(metadata);
	}
	(images, metadatas)
}

pub fn combine_imageblock(mut images: HashMap<i32, Vec<u8>>, image_metadatas: Vec<ImageMetadata>) -> cstc::ImageBlock {
	image_metadatas.into_iter().filter_map(|metadata| {
		if let Some(image) = images.remove(&metadata.id) {
			Some(cstc::ImageResource::new(image, metadata))
		} else {
			log::error!("Could not find image {}", metadata.id);
			None
		}
	}).collect()
}

#[instrument]
pub async fn images_from_dir(images_dir: PathBuf) -> Result<HashMap<i32, Vec<u8>>> {
	let images: RwLock<HashMap<i32, Vec<u8>>> = RwLock::new(HashMap::new());

	let entries = ReadDirStream::new(match tokio::fs::read_dir(&images_dir).await {
		Ok(v) => v,
		Err(e) => match e.kind() {
			std::io::ErrorKind::NotFound => { return Ok(images.into_inner()) },
			_ => Err(e)?,
		}
	});
	entries.for_each_concurrent(None, |entry| async {
		let _: Result<()> = async {
			let entry = entry?;
			let path = entry.path();
			if path.file_name().context("bad filename")?.to_string_lossy().ends_with(".png") {
				if let Some(s) = path.file_stem() {
					if let Ok(id) = str::parse::<i32>(&s.to_string_lossy()) {
						match fs_err::read(path) {
							Ok(data) => {
								let mut found_images_by_id = images.write().await;
								found_images_by_id.insert(id, data);
							}
							Err(e) => match e.kind() {
								std::io::ErrorKind::IsADirectory => {},
								_ => Err(e)?
							}
						}
					}
				}
			}
			Ok(())
		}.await;
	}).await;

	Ok(images.into_inner())
}

#[instrument]
pub async fn images_from_zip(zip_path: PathBuf) -> Result<HashMap<i32, Vec<u8>>> {
	tokio::task::spawn_blocking(|| -> Result<HashMap<i32, Vec<u8>>> {
		let archive = std::fs::File::open(zip_path)?;
		let mut zip = zip::ZipArchive::new(archive)?;

		let mut images = HashMap::with_capacity(zip.len());

		for i in 0..zip.len() {
			let result: Result<()> = try {
				let mut file = zip.by_index(i)?;
				if !file.is_file() { continue }
				let filename = file.name();
				if filename.starts_with("images/") && filename.ends_with(".png") {
					let path = file.enclosed_name().with_context(|| format!("bad zip entry: {filename}"))?;
					let file_stem = path.file_stem().with_context(|| format!("bad image name: {path:?}"))?.to_string_lossy();
					if let Ok(i) = str::parse::<i32>(&file_stem) {
						let mut buf = Vec::new();
						file.read_to_end(&mut buf)?;
						images.insert(i, buf);
					};
				}
			};
			if let Err(e) = result {
				log::error!("{}", e);
			}
		}

		anyhow::Ok(images)
	}).await?
}

pub async fn images_from_game(game_path: &Path) -> Result<(HashMap<i32, Vec<u8>>, Vec<ImageMetadata>)> {
	let image_block = cstc::ImageBlock::read_from_pe(&game_path).await?;
	Ok(split_imageblock(image_block))
}

