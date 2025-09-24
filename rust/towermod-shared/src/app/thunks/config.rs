use std::path::PathBuf;
use crate::app::state::{STORE, ConfigAction as Action};
use crate::app::selectors::get_config;
use anyhow::{Context, Result};
use fs_err::tokio as fs;

fn config_path() -> PathBuf {
	crate::get_cache_dir_path().join("towermod-config.toml")
}

// TODO: include towermod version
pub async fn save_config() -> Result<()> {
	let path = config_path();
	let config = get_config().await;
	let s = toml::to_string_pretty(&config)?;
	fs::write(path, s).await.context("Failed to write config")?;
	Ok(())
}

pub async fn load_config() -> Result<()> {
	let path = config_path();
	match fs::read_to_string(path).await {
		Ok(s) => {
			let config = toml::from_str(&s).context("Failed to parse config")?;
			STORE.dispatch(Action::SetConfig(config).into()).await;
			Ok(())
		}
		Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
			// Initialize config file if none exists
			save_config().await
		},
		Err(e) => Err(e).context("Failed to read config"),
	}
}
