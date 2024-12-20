use napi_derive::napi;
use anyhow::{Result, Context};
use fs_err::tokio as fs;
use crate::{Nt};
use super::state::select;

// select

#[napi(ts_return_type = "Uint8Array | null")]
pub async fn get_image(id: i32) -> Option<Nt<Vec<u8>>> {
	let image = get_image_override(id).await.ok();
	if let Some(Some(image)) = image {
		return Some(Nt(image));
	};
	let image = select(move |s| {
		s.data.image_block.iter()
			.find(|image| image.id == id)
			.map(|image| Nt(image.data.clone()))
	}).await;
	image
}

async fn get_image_override(id: i32) -> Result<Option<Vec<u8>>> {
	let project = select(|s| s.project.clone()).await
		.context("No project loaded")?;

	let mut path = project.images_path()?;
	path.push(format!("{id}.png"));
	match fs::read(&path).await {
		Ok(v) => Ok(Some(v)),
		Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
		Err(e) => Err(e)?,
	}
}

// dispatch

// other

#[napi(ts_args_type = "gamePath: string")]
pub async fn run_game() -> Result<()> {
	let Nt(game_path) = select(|s| -> Option<_> {
		Some(s.project.as_ref()?.game.file_path.as_ref()?.clone())
	}).await.context("No project loaded")?;


	crate::run_game(&game_path).await?;
	Ok(())
}
