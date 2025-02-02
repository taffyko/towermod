use std::path::PathBuf;
use anyhow::{Context, Result};
use tracing::instrument;
use crate::{app::state::CstcData, cstc::{self, AppBlock, EventBlock, LevelBlock}, Game, Nt, PeResource};
use crate::app::{selectors, state::{select, AppAction, DataAction, STORE}};
use fs_err::tokio as fs;

fn status(_msg: &str) {
	// TODO
}

pub async fn get_image(id: i32) -> Option<Vec<u8>> {
	let image = get_image_override(id).await.ok();
	if let Some(Some(image)) = image {
		return Some(image);
	};
	selectors::get_image(id).await
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
