//! Methods related to files that towermod persists on disk

use fs_err::tokio as fs;
use tauri::command;
use tracing::instrument;
use windows::Win32::UI::Shell;
use windows::Win32::Foundation::HANDLE;
use anyhow::Result;
use std::path::{Path, PathBuf};

use super::log_on_error;

/// Directory where cached data is stored
/// Anything here should be safe to delete without data loss
#[command]
pub fn get_cache_dir_path() -> PathBuf {
	let localappdata_dir = unsafe { Shell::SHGetKnownFolderPath(&Shell::FOLDERID_LocalAppData, Shell::KNOWN_FOLDER_FLAG(0), HANDLE::default()).unwrap().to_string().unwrap() };
	[&*localappdata_dir, "towermod", "cache"].iter().collect()
}

#[command]
pub fn get_stable_exe_path() -> PathBuf {
	let localappdata_dir = unsafe { Shell::SHGetKnownFolderPath(&Shell::FOLDERID_LocalAppData, Shell::KNOWN_FOLDER_FLAG(0), HANDLE::default()).unwrap().to_string().unwrap() };
	[&*localappdata_dir, "towermod", "towermod.exe"].iter().collect()
}


#[command]
pub fn get_appdata_dir_path() -> PathBuf {
	unsafe {
		let appdata_dir = Shell::SHGetKnownFolderPath(&Shell::FOLDERID_RoamingAppData, Shell::KNOWN_FOLDER_FLAG(0), HANDLE::default()).unwrap().to_string().unwrap();
		PathBuf::from(appdata_dir)
	}
}

/// Root directory for all towermod data & configuration
#[command]
pub fn get_towermod_dir_path() -> PathBuf {
	unsafe {
		let documents_dir = Shell::SHGetKnownFolderPath(&Shell::FOLDERID_Documents, Shell::KNOWN_FOLDER_FLAG(0), HANDLE::default()).unwrap().to_string().unwrap();
		[&*documents_dir, "towermod"].iter().collect()
	}
}

/// Root for all per-mod cache files
#[command]
pub fn mod_cache_dir_path(mod_subpath: impl AsRef<Path>) -> PathBuf {
	let mut dir = get_cache_dir_path();
	dir.push("mods");
	dir.push(mod_subpath);
	dir
}

/// Directory where a copy of the game's installation files is created while running the mod
#[command]
pub fn mod_runtime_dir_path(mod_name: impl AsRef<Path>) -> PathBuf {
	let mut dir = mod_cache_dir_path(mod_name);
	dir.push("runtime");
	dir
}


/// Subdirectory where installed mods are stored
#[command]
pub fn get_mods_dir_path() -> PathBuf {
	let mut path = get_towermod_dir_path();
	path.push("mods");
	path
}

/// Default suggested directory for newly created projects
#[command]
pub fn get_default_project_dir_path() -> PathBuf {
	let mut path = get_towermod_dir_path();
	path.push("dev");
	path
}

/// Uses "dumb" heuristics to try to find the TowerClimb game executable, if it can
pub fn try_find_towerclimb() -> Result<PathBuf> {
	let program_files_x86 = unsafe { Shell::SHGetKnownFolderPath(&Shell::FOLDERID_ProgramFilesX86, Shell::KNOWN_FOLDER_FLAG(0), HANDLE::default())?.to_string()? };
	let mut path: PathBuf = [&*program_files_x86, r"Steam\steamapps\common\TowerClimb"].iter().collect();
	// give up if installion dir doesn't exist
	if !path.is_dir() {
		// TODO: also search null/SteamLibrary on other drives
		anyhow::bail!("Could not find TowerClimb executable");
	}

	// look for exe by exact name
	path.push("TowerClimb_V1_Steam4.exe");
	if path.is_file() {
		return Ok(path);
	}

	// otherwise look for an exe containing the word "TowerClimb" (case-insensitive)
	path.pop();
	let pattern = glob::Pattern::escape(&*path.to_string_lossy()) + r"\*towerclimb*.exe";

	match glob::glob_with(&pattern, MATCH_OPTIONS).unwrap().next() {
		Some(r) => Ok(r.map_err(|e| e.into_error())?),
		None => anyhow::bail!("Could not find TowerClimb executable"),
	}
}

/// Should be idempotent
#[instrument]
pub async fn first_time_setup() -> Result<()> {
	link_towermod_to_stable_path().await?;

	crate::registry::initialize_registry_settings()?;

	#[cfg(feature = "bundled-dllreader")]
	{
		fs::create_dir_all(get_mods_dir_path()).await?;
		fs::create_dir_all(get_cache_dir_path()).await?;
		fs::write(get_dllreader_path(), get_dllreader_exe_bytes()).await?;
		Ok(())
	}
	#[cfg(not(feature = "bundled-dllreader"))]
	anyhow::bail!("This build was not compiled with bundled dllreader");
}

async fn link_towermod_to_stable_path() -> Result<()> {
	// Hardlink Towermod to a stable path
	// FIXME: Don't copy if the version has not changed
	let exe_path = std::env::current_exe()?;
	let dest_path = get_stable_exe_path();
	if exe_path == dest_path { return Ok(()) }
	let _ = fs::remove_file(&dest_path).await;
	if let Err(_) = fs::hard_link(&exe_path, &dest_path).await {
		log_on_error(fs::copy(&exe_path, &dest_path).await);
	}
	Ok(())
}

pub fn get_dllreader_path() -> PathBuf {
	let mut path = get_cache_dir_path();
	path.push("dllreader.exe");
	path
}

#[cfg(feature = "bundled-dllreader")]
fn get_dllreader_exe_bytes() -> Vec<u8> {
	#[cfg(debug_assertions)]
	let dllreader_exe = fs_err::read(env!("DLLREADER_EXE")).unwrap();
	#[cfg(not(debug_assertions))]
	let dllreader_exe = include_bytes!(env!("DLLREADER_EXE")).to_vec();
	dllreader_exe
}

/// Location where downloaded Construct Classic files are cached
pub async fn cstc_binary_dir() -> Result<PathBuf> {
	let cstc_binary_dir = get_cache_dir_path().join("cstc");
	let exists = tokio::fs::try_exists(&cstc_binary_dir).await?;
	if !exists {
		let bytes = reqwest::get("https://github.com/taffyko/towermod/raw/construct-classic-bin/ConstructClassic.zip")
			.await?.bytes().await?;
		zip_extract::extract(std::io::Cursor::new(&bytes), &cstc_binary_dir, true)?;
	}
	Ok(cstc_binary_dir)
}

static MATCH_OPTIONS: glob::MatchOptions = glob::MatchOptions {
	require_literal_separator: true,
	require_literal_leading_dot: true,
	case_sensitive: false,
};
