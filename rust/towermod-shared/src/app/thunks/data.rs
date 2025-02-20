use anyhow::{Context, Result};
use towermod_cstc::ImageMetadata;
use crate::{app::state::{data_state::JsCstcData, select, DataAction, STORE}};
use fs_err::tokio as fs;

pub async fn get_image(id: i32) -> Option<Vec<u8>> {
	let image = get_image_override(id).await.ok();
	if let Some(Some(image)) = image {
		return Some(image);
	};
	get_dumped_game_image(id).await.ok().flatten()
}

async fn get_dumped_game_image(id: i32) -> Result<Option<Vec<u8>>> {
	let mut path = select(|s| s.game.as_ref().context("No game set").map(|p| p.image_dump_dir_path())).await?;
	path.push(format!("{id}.png"));
	match fs::read(&path).await {
		Ok(v) => Ok(Some(v)),
		Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
		Err(e) => Err(e)?,
	}
}

async fn get_image_override(id: i32) -> Result<Option<Vec<u8>>> {
	let mut path = select(|s| s.project.as_ref().context("No project loaded").map(|p| p.images_path())).await??;
	path.push(format!("{id}.png"));
	match fs::read(&path).await {
		Ok(v) => Ok(Some(v)),
		Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
		Err(e) => Err(e)?,
	}
}

pub async fn is_image_overridden(id: i32) -> Result<bool> {
	let mut path = select(|s| s.project.as_ref().context("No project loaded").map(|p| p.images_path())).await??;
	path.push(format!("{id}.png"));
	Ok(path.exists())
}

pub async fn set_image_metadata(data: ImageMetadata) {
	STORE.dispatch(DataAction::SetImageMetadata(data).into()).await;
}

pub async fn update_data(new_data: JsCstcData) {
	STORE.dispatch(DataAction::UpdateData(new_data).into()).await;
}
