use std::path::{Path, PathBuf};
use tauri::command;
use anyhow::Result;
use fs_err::tokio as fs;
use towermod_shared::FileDialogOptions;

use crate::{app::thunks, app::selectors, Game};

// #[command]
// pub fn greet(name: &str) -> String {
// 	format!("Hello, {}! You've been greeted from Rust!", name)
// }

#[command]
pub async fn get_image(
	_window: tauri::Window,
	request: tauri::ipc::Request<'_>,
) -> Result<tauri::ipc::Response> {
	if let tauri::ipc::InvokeBody::Raw(payload) = request.body() {
		let payload = String::from_utf8_lossy(payload).to_string();
		let id: i32 = serde_json::from_str(&payload)?;

		let data = thunks::get_image(id).await.unwrap_or(vec![]);

		Ok(tauri::ipc::Response::new(data))
	} else {
		Err(anyhow::anyhow!("Invalid request").into())
	}
}

#[command]
pub async fn get_file(
	_window: tauri::Window,
	request: tauri::ipc::Request<'_>,
) -> Result<tauri::ipc::Response> {
	if let tauri::ipc::InvokeBody::Raw(payload) = request.body() {
		let payload = String::from_utf8_lossy(payload).to_string();
		let path: String = serde_json::from_str(&payload)?;

		let data = fs::read(path).await.unwrap_or(vec![]);

		Ok(tauri::ipc::Response::new(data))
	} else {
		Err(anyhow::anyhow!("Invalid request").into())
	}
}

#[command]
pub const fn get_version() -> &'static str { crate::VERSION }

#[command]
pub fn get_cache_dir_path() -> PathBuf { crate::get_cache_dir_path() }

#[command]
pub fn get_stable_exe_path() -> PathBuf { crate::get_stable_exe_path() }

#[command]
pub fn get_appdata_dir_path() -> PathBuf { crate::get_appdata_dir_path() }

#[command]
pub fn get_towermod_dir_path() -> PathBuf { crate::get_towermod_dir_path() }

#[command]
pub fn mod_cache_dir_path(mod_subpath: impl AsRef<Path>) -> PathBuf { crate::mod_cache_dir_path(mod_subpath) }

#[command]
pub fn mod_runtime_dir_path(mod_name: impl AsRef<Path>) -> PathBuf { crate::mod_runtime_dir_path(mod_name) }

#[command]
pub fn get_mods_dir_path() -> PathBuf { crate::get_mods_dir_path() }

#[command]
pub fn get_default_project_dir_path() -> PathBuf { crate::get_default_project_dir_path() }

#[command]
pub fn open_folder(dir: &Path) -> Result<()> { crate::open_folder(dir) }

#[command]
pub async fn folder_picker(options: Option<FileDialogOptions>) -> Result<Option<PathBuf>> { crate::folder_picker(options).await }

#[command]
pub async fn file_picker(options: Option<FileDialogOptions>) -> Result<Option<PathBuf>> { crate::file_picker(options).await }

#[command]
pub async fn copy_file(src: PathBuf, dest: PathBuf) -> Result<()> {
	if (src == dest) { return Ok(()) }
	fs::copy(src, dest).await?;
	Ok(())
}

#[command]
pub async fn delete_file(path: PathBuf) -> Result<()> {
	fs::remove_file(path).await?;
	Ok(())
}
