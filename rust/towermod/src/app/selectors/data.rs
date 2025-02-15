//! APIs for requesting data from the state

use tauri::command;
use crate::{app::state::select, cstc::{plugin::PluginData, ImageMetadata}};


#[command]
pub async fn get_editor_plugin(id: i32) -> Option<PluginData> {
	select(move |s| s.data.editor_plugins.get(&id).map(|p| p.clone())).await
}

#[command]
pub async fn get_image_metadata(id: i32) -> Option<ImageMetadata> {
	select(move |s| s.data.image_block.iter().find(|img| img.id == id).map(|p| p.clone())).await
}
