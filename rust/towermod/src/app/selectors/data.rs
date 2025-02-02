//! APIs for requesting data from the state

use crate::app::state::select;
use anyhow::{Context, Result};
use crate::{Game, Nt, Project};
use fs_err::tokio as fs;

pub async fn get_image(id: i32) -> Option<Vec<u8>> {
	select(move |s| {
		s.data.image_block.iter()
			.find(|image| image.id == id)
			.map(|image| image.data.clone())
	}).await
}
