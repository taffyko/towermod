use std::{cell::RefCell, sync::RwLock};

use anyhow::{Context, Result};
use futures::StreamExt;
use towermod_cstc::{ImageMetadata, ObjectType};
use crate::{app::{selectors, state::{select, DataAction, STORE}}, cstc_editing::EdObjectInstance};
use fs_err::tokio as fs;

pub async fn get_image(id: i32) -> Option<Vec<u8>> {
	let image = get_image_override(id).await.ok();
	if let Some(Some(image)) = image {
		return Some(image);
	};
	get_dumped_game_image(id).await.ok().flatten()
}

pub async fn get_outliner_object_type_icons(skip: usize, take: usize) -> Vec<Option<(i32, Vec<u8>)>> {
	let ids = select(selectors::select_outliner_object_type_image_ids(skip, take)).await;
	let images: RwLock<Vec<Option<(i32, Vec<u8>)>>> = RwLock::new(vec![None; ids.len()]);
	{
		let images = &images;
		futures::stream::iter(ids).enumerate().for_each_concurrent(None, |(idx, id)| async move {
			if let Some(id) = id {
				let image = get_image(id).await;
				let mut images = images.write().unwrap();
				images[idx] = image.map(|image| (id, image));
			}
		}).await;
	}
	images.into_inner().unwrap()
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
	let Some(mut path) = select(|s| s.project.as_ref().map(|p| p.images_path().ok()).flatten()).await else {
		// no project dir set
		return Ok(None)
	};
	path.push(format!("{id}.png"));
	match fs::read(&path).await {
		Ok(v) => Ok(Some(v)),
		Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
		Err(e) => Err(e)?,
	}
}

pub async fn is_image_overridden(id: i32) -> bool {
	let Some(mut path) = select(|s| s.project.as_ref().map(|p| p.images_path().ok()).flatten()).await else {
		// no project dir set
		return false
	};
	path.push(format!("{id}.png"));
	path.exists()
}

pub async fn set_image_metadata(data: ImageMetadata) {
	STORE.dispatch(DataAction::SetImageMetadata(data).into()).await;
}
