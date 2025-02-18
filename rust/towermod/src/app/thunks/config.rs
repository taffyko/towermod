use std::path::PathBuf;
use tauri::command;
use crate::app::state::{STORE, ConfigAction as Action};
use crate::app::selectors::get_config;
use anyhow::{Context, Result};
use fs_err::tokio as fs;

fn config_path() -> PathBuf {
	crate::get_cache_dir_path().join("towermod-config.toml")
}

// TODO: include towermod version
#[command]
pub async fn save_config() -> Result<()> {
	let path = config_path();
	let config = get_config().await;
	let s = toml::to_string_pretty(&config)?;
	fs::write(path, s).await.context("Failed to write config")?;
	Ok(())
}

#[command]
pub async fn load_config() -> Result<()> {
	let path = config_path();
	let s = fs::read_to_string(path).await.context("Failed to read config")?;
	let config = toml::from_str(&s).context("Failed to parse config")?;
	STORE.dispatch(Action::SetConfig(config).into()).await;
	Ok(())
}
