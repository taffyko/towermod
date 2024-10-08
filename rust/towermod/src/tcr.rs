/// Deserialize and apply legacy TCRepainter patches
use std::{collections::HashMap, io::{Seek, SeekFrom, Write}};
use serde::Deserialize;

#[allow(unused)]
#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct TcrepainterPatch {
	created_tcr_version: String,
	last_tcr_version: String,
	game_version: String,
	image_count: u64,
	string_map: Vec<PatchableString>,
	png_map: Vec<DelimitedData>,
	fonts: Vec<PatchableString>,
	menus: Vec<PatchableMenu>,
}

#[allow(unused)]
#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct DelimitedData {
	start: u64,
	end: u64,
}

#[allow(unused)]
#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct PatchableString {
	start: u64,
	end: u64,
	#[serde(rename = "Override")]
	string: Option<String>,
}

#[allow(unused)]
#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct PatchableMenu {
	body: Option<PatchableString>,
	recipe: Option<PatchableString>,
}

impl TcrepainterPatch {
	pub fn patch(&self, images: &HashMap<i32, Vec<u8>>, mut bin: impl Write + Seek) -> anyhow::Result<()> {
		for (i, png) in self.png_map.iter().enumerate() {
			if let Some(image) = images.get(&(i as i32)) {
				let len = image.len();
				let max_len = png.end - png.start;
				if image.len() > max_len as usize {
					anyhow::bail!("image {i} is {len} bytes, which exceeds maximum of {max_len} bytes");
				}
				bin.seek(SeekFrom::Start(png.start))?;
				bin.write_all(&*image)?;
			}
		}

		for s in &self.string_map {
			if let Some(string) = &s.string {
				bin.seek(SeekFrom::Start(s.start))?;
				bin.write_all(string.as_bytes())?;
				bin.write(&[0])?;
			}
		}
		
		for s in &self.fonts {
			if let Some(string) = &s.string {
				bin.seek(SeekFrom::Start(s.start))?;
				bin.write_all(string.as_bytes())?;
				bin.write(&[0])?;
			}
		}

		for menu in &self.menus {
			if let Some(PatchableString { start, string: Some(string), .. }) = &menu.body {
				bin.seek(SeekFrom::Start(*start))?;
				bin.write_all(string.as_bytes())?;
				bin.write(&[0])?;
			}
			if let Some(PatchableString { start, string: Some(string), .. }) = &menu.recipe {
				bin.seek(SeekFrom::Start(*start))?;
				bin.write_all(string.as_bytes())?;
				bin.write(&[0])?;
			}
		}
		
		Ok(())
	}
}
