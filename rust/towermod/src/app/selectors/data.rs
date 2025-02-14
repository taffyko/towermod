//! APIs for requesting data from the state

use tauri::command;
use crate::{app::state::select, cstc::plugin::PluginData};


#[command]
pub async fn get_editor_plugin(id: i32) -> Option<PluginData> {
	select(move |s| s.data.editor_plugins.get(&id).map(|p| p.clone())).await
}

