use crate::app::state::select;
use tauri::command;
use anyhow::{Context, Result};
use crate::{Game, Nt, Project};
use fs_err::tokio as fs;

#[command]
pub async fn get_project() -> Option<Project> {
	select(|s| s.project.clone()).await
}

#[command]
pub async fn get_game() -> Option<Game> {
	select(|s| s.game.clone()).await
}

#[command]
pub async fn is_data_loaded() -> bool {
	select(|s| !s.data.editor_plugins.is_empty()).await
}
