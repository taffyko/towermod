//! APIs for requesting data from the state

use std::collections::HashMap;

use crate::{app::state::{data_state::JsCstcData, select}};
use towermod_cstc::{plugin::PluginData, ImageMetadata};


pub async fn get_editor_plugin(id: i32) -> Option<PluginData> {
	select(move |s| s.data.editor_plugins.get(&id).map(|p| p.clone())).await
}

pub async fn get_editor_plugins() -> HashMap<i32, PluginData> {
	select(move |s| s.data.editor_plugins.clone()).await
}

pub async fn get_image_metadata(id: i32) -> Option<ImageMetadata> {
	select(move |s| s.data.image_block.iter().find(|img| img.id == id).map(|p| p.clone())).await
}

pub async fn is_data_loaded() -> bool {
	select(|s| !s.data.editor_plugins.is_empty()).await
}

pub async fn get_data() -> Option<JsCstcData> {
	if !is_data_loaded().await { return None }
	Some(select(|s| { JsCstcData::get(&s.data) }).await)
}
