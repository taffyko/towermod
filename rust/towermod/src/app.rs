use std::io::Read;

use crate::{get_mods_dir_path, ModInfo};
use anyhow::{Result, Context};
use fs_err::tokio as fs;
use napi_derive::napi;

#[napi]
pub async fn list_installed_mods() -> Result<Vec<ModInfo>> {
	
	let mut stream = fs::read_dir(get_mods_dir_path()).await?;
	let mut mods: Vec<ModInfo> = Vec::new();
	while let Some(entry) = stream.next_entry().await? {
		let meta = entry.metadata().await?;
		if meta.is_file() {
			let path = entry.path();
			let file_name = path.file_name().context("bad filename")?.to_string_lossy();
			if let Result::<_>::Err(_e) = try {
				if !file_name.ends_with(".zip") { continue }
				// TODO: make async
				let file = fs_err::File::open(&path)?;
				let mut zip = zip::ZipArchive::new(file)?;
				let mut mod_info = {
					let mut mod_info: ModInfo = {
						let mut file = zip.by_name("manifest.toml")?;
						let mut s = String::new();
						file.read_to_string(&mut s)?;
						toml::from_str(&s)?
					};

					if let Ok(mut file) = zip.by_name("icon.png") {
						let mut icon = vec![];
						file.read_to_end(&mut icon)?;
						mod_info.icon = Some(icon);
					}

					if let Ok(mut file) = zip.by_name("cover.png") {
						let mut cover = vec![];
						file.read_to_end(&mut cover)?;
						mod_info.cover = Some(cover);
					}

					mod_info
				};
				mod_info.file_path = Some(path.clone().into());
				mods.push(mod_info);
			} {
				// FIXME
				// crate::util::show_error(e.context(format!("Error reading mod: {file_name:?}")));
				continue
			};
		}
	}
	Ok(mods)
}
