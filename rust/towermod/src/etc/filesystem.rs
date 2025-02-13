use core::slice;
use std::cell::RefCell;
use std::collections::HashMap;
use std::ffi::{c_void, CString};
use std::fmt::Debug;
use std::io::{self, Cursor, Read, Write};
use crate::ZipWriterExt;
use async_scoped::TokioScope;
use serde::{Deserialize, Serialize};
use tauri::command;
use ::time::OffsetDateTime;
use tokio_stream::StreamExt;
use zip;
use std::path::{Path, PathBuf};
use log::warn;
use tokio::io::{AsyncSeekExt, AsyncWriteExt};
use tokio::task::JoinSet;
use tokio::{process::Command, task};
use fs_err::tokio as fs;
use tracing::{instrument, Instrument, info_span};
use windows::Win32::Storage::FileSystem::{GetFileVersionInfoSizeW, GetFileVersionInfoW, GetTempFileNameW, VerQueryValueW};
use windows::Win32::System::LibraryLoader::{BeginUpdateResourceW, EndUpdateResourceW, EnumResourceNamesW, EnumResourceTypesExW, FindResourceExW, LoadLibraryExW, LoadResource, LockResource, SizeofResource, UpdateResourceW, LOAD_LIBRARY_AS_DATAFILE};
use windows::Win32::System::Memory::{VirtualQueryEx, MEMORY_BASIC_INFORMATION, VirtualProtectEx, PAGE_PROTECTION_FLAGS, PAGE_EXECUTE_READWRITE};
use windows::Win32::System::ProcessStatus::{self, EnumProcessModules, GetModuleBaseNameW};
use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_VM_READ, OpenProcessToken, GetCurrentProcess, PROCESS_ALL_ACCESS, OpenThread, THREAD_ALL_ACCESS, SuspendThread, ResumeThread, TerminateProcess};
use anyhow::{bail, Context, Result};
use windows::Win32::Foundation::{HANDLE, HMODULE, BOOL, LUID, CloseHandle, FreeLibrary, MAX_PATH};
use windows::Win32::System::Diagnostics::ToolHelp::{CreateToolhelp32Snapshot, TH32CS_SNAPTHREAD, THREADENTRY32, Thread32First, Thread32Next, TH32CS_SNAPMODULE, MODULEENTRY32W, Module32FirstW};
use windows::core::{PCWSTR, PWSTR, HSTRING};
use std::mem::{size_of_val, MaybeUninit};
use crate::cstc::plugin::{PluginData, PluginStringTable};
use crate::cstc::{self, plugin};
use crate::{Game, ModInfo, ModType, Project};
use crate::macros::*;
use super::{cstc_binary_dir, get_dllreader_path};

#[instrument]
pub async fn get_temp_file() -> Result<PathBuf> {
	unsafe {
		let buffer = task::spawn_blocking(|| {
			let mut buffer = [0u16; MAX_PATH as usize];
			GetTempFileNameW(
				&HSTRING::from(&*std::env::temp_dir().as_path()),
				&HSTRING::from("tow"),
				0,
				&mut buffer
			);
			buffer
		}).await?;
		let len = buffer.iter().position(|v| *v == 0).unwrap();
		let s = String::from_utf16_lossy(&buffer[0..len]);
		Ok(s.into())
	}
}

#[command]
pub fn open_folder(dir: &Path) -> Result<()> {
	use std::process::Command;
	let _ = Command::new("explorer.exe")
		.arg(".")
		.current_dir(dir)
		.spawn()?;
	Ok(())
}

#[command]
pub async fn copy_file(src: PathBuf, dest: PathBuf) -> Result<()> {
	if (src == dest) { return Ok(()) }
	fs::copy(src, dest).await?;
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

#[command]
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

#[command]
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
