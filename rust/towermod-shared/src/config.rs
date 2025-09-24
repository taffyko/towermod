//! Methods related to files that towermod persists on disk

use fs_err::tokio as fs;
use tracing::instrument;
use anyhow::Result;
use std::path::{Path, PathBuf};
use towermod_util::log_on_error;
use directories::{BaseDirs, UserDirs};

use crate::dllreader_client;

/// Directory where cached data is stored
/// Anything here should be safe to delete without data loss
pub fn get_cache_dir_path() -> PathBuf {
	let base_dirs = BaseDirs::new().unwrap();
	if cfg!(windows) {
		return base_dirs.cache_dir().join("towermod/cache")
	} else {
		return base_dirs.cache_dir().join("towermod")
	}
}

pub fn get_stable_exe_path() -> PathBuf {
	let base_dirs = BaseDirs::new().unwrap();
	base_dirs.data_local_dir().join("towermod/towermod.exe")
}


/// Get the AppData directory where TowerClimb stores its savedata and settings
pub fn get_towerclimb_appdata_dir_path() -> PathBuf {
	#[cfg(windows)]
	unsafe {
		use windows::Win32::UI::Shell;
		use windows::Win32::Foundation::HANDLE;
		let appdata_dir = Shell::SHGetKnownFolderPath(&Shell::FOLDERID_RoamingAppData, Shell::KNOWN_FOLDER_FLAG(0), HANDLE::default()).unwrap().to_string().unwrap();
		return PathBuf::from(appdata_dir);
	}
	#[cfg(not(windows))]
	{
		// BUG: make this customizable
		let base_dirs = BaseDirs::new().unwrap();
		return base_dirs.data_local_dir().join("Steam/steamapps/steamapps/compatdata/396640/pfx/drive_c/users/steamuser/AppData/Roaming");
	}
}

/// Root directory for all towermod data & configuration
pub fn get_towermod_dir_path() -> PathBuf {
	let user_dirs = UserDirs::new().unwrap();
	user_dirs.document_dir().unwrap().join("towermod")
}

/// Root for all per-mod cache files
pub fn mod_cache_dir_path(mod_subpath: impl AsRef<Path>) -> PathBuf {
	let mut dir = get_cache_dir_path();
	dir.push("mods");
	dir.push(mod_subpath);
	dir
}

/// Directory where a copy of the game's installation files is created while running the mod
pub fn mod_runtime_dir_path(mod_name: impl AsRef<Path>) -> PathBuf {
	let mut dir = mod_cache_dir_path(mod_name);
	dir.push("runtime");
	dir
}


/// Subdirectory where installed mods are stored
pub fn get_mods_dir_path() -> PathBuf {
	let mut path = get_towermod_dir_path();
	path.push("mods");
	path
}

/// Default suggested directory for newly created projects
pub fn get_default_project_dir_path() -> PathBuf {
	let mut path = get_towermod_dir_path();
	path.push("dev");
	path
}

/// Uses "dumb" heuristics to try to find the TowerClimb game executable, if it can
pub fn try_find_towerclimb() -> Result<PathBuf> {
	let mut path: PathBuf;
	#[cfg(windows)]
	{
		let program_files_x86 = unsafe { Shell::SHGetKnownFolderPath(&Shell::FOLDERID_ProgramFilesX86, Shell::KNOWN_FOLDER_FLAG(0), HANDLE::default())?.to_string()? };
		path = [&*program_files_x86, r"Steam\steamapps\common\TowerClimb"].iter().collect();
	}
	#[cfg(not(windows))]
	{
		let base_dirs = BaseDirs::new().unwrap();
		path = base_dirs.data_local_dir().join("Steam/steamapps/common/TowerClimb");
	}
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
	fs::create_dir_all(get_mods_dir_path()).await?;
	fs::create_dir_all(get_cache_dir_path()).await?;

	#[cfg(windows)]
	{
		let stable_exe_path = crate::get_stable_exe_path();
		let stable_exe_path = stable_exe_path.to_string_lossy();
		towermod_win32::registry::initialize_registry_settings(&stable_exe_path)?;
	}
	// TODO: register URL handling and file associations on Linux as well

	log_on_error(dllreader_client::extract_dllreader().await);

	Ok(())
}

async fn link_towermod_to_stable_path() -> Result<()> {
	// Hardlink Towermod to a stable path
	// TODO: Don't copy if the version has not changed
	let exe_path = std::env::current_exe()?;
	let dest_path = get_stable_exe_path();
	if exe_path == dest_path { return Ok(()) }
	let _ = fs::remove_file(&dest_path).await;
	if let Err(_) = fs::hard_link(&exe_path, &dest_path).await {
		log_on_error(fs::copy(&exe_path, &dest_path).await);
	}
	Ok(())
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
