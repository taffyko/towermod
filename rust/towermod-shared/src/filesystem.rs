use std::fmt::Debug;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tokio::task;
use fs_err::tokio as fs;
use tracing::instrument;
use windows::Win32::Storage::FileSystem::GetTempFileNameW;
use anyhow::Result;
use windows::Win32::Foundation::MAX_PATH;
use windows::core::HSTRING;

pub fn open_folder(dir: &Path) -> Result<()> {
	use std::process::Command;
	let _ = Command::new("explorer.exe")
		.arg(".")
		.current_dir(dir)
		.spawn()?;
	Ok(())
}

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileDialogOptions {
	pub multi: Option<bool>,
	pub filters: Option<Vec<FileDialogFilter>>,
	pub starting_directory: Option<PathBuf>,
	pub file_name: Option<String>,
	pub title: Option<String>,
	pub can_create_directories: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileDialogFilter {
	name: String,
	extensions: Vec<String>,
}

fn set_file_dialog_options(mut file_dialog: rfd::FileDialog, options: &FileDialogOptions) -> rfd::FileDialog {
	if let Some(filters) = &options.filters {
		for filter in filters {
			file_dialog = file_dialog.add_filter(&filter.name, &*filter.extensions);
		}
	}
	if let Some(v) = options.can_create_directories {
		file_dialog = file_dialog.set_can_create_directories(v);
	}
	if let Some(v) = &options.starting_directory {
		file_dialog = file_dialog.set_directory(v);
	}
	if let Some(v) = &options.title {
		file_dialog = file_dialog.set_title(v);
	}
	if let Some(v) = &options.file_name {
		file_dialog = file_dialog.set_file_name(v);
	}
	file_dialog
}

pub async fn folder_picker(options: Option<FileDialogOptions>) -> Result<Option<PathBuf>> {
	let result = tokio::task::spawn_blocking(move || {
		let mut file_dialog = rfd::FileDialog::new();
		if let Some(options) = &options {
			file_dialog = set_file_dialog_options(file_dialog, options)
		}
		file_dialog.pick_folder()
	}).await?;
	Ok(result)
}

pub async fn file_picker(options: Option<FileDialogOptions>) -> Result<Option<PathBuf>> {
	let result = tokio::task::spawn_blocking(move || {
		let mut file_dialog = rfd::FileDialog::new();
		if let Some(options) = options {
			file_dialog = set_file_dialog_options(file_dialog, &options)
		}
		file_dialog.pick_file()
	}).await?;
	Ok(result)
}
