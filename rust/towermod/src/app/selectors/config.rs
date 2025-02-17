use tauri::command;
use crate::app::state::{select, TowermodConfig};


#[command]
pub async fn get_config() -> TowermodConfig {
	select(|s| s.config.clone()).await
}
