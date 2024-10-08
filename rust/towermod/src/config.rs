use tracing::instrument;
use windows::Win32::UI::Shell;
use windows::Win32::Foundation::HANDLE;
use anyhow::Result;
use std::path::{Path, PathBuf};
use fs_err::tokio as fs;

/// Directory where cached data is stored
/// Anything here should be safe to delete without data loss
pub fn get_cache_dir_path() -> PathBuf {
	unsafe {
		let localappdata_dir = Shell::SHGetKnownFolderPath(&Shell::FOLDERID_LocalAppData, Shell::KNOWN_FOLDER_FLAG(0), HANDLE::default()).unwrap().to_string().unwrap();
		[&*localappdata_dir, "towermod", "cache"].iter().collect()
	}
}

pub fn get_appdata_dir_path() -> PathBuf {
	unsafe {
		let appdata_dir = Shell::SHGetKnownFolderPath(&Shell::FOLDERID_RoamingAppData, Shell::KNOWN_FOLDER_FLAG(0), HANDLE::default()).unwrap().to_string().unwrap();
		PathBuf::from(appdata_dir)
	}
}

/// Root directory for all towermod data & configuration
pub fn get_towermod_dir_path() -> PathBuf {
	unsafe {
		let documents_dir = Shell::SHGetKnownFolderPath(&Shell::FOLDERID_Documents, Shell::KNOWN_FOLDER_FLAG(0), HANDLE::default()).unwrap().to_string().unwrap();
		[&*documents_dir, "towermod"].iter().collect()
	}
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
pub fn try_find_towerclimb() -> Result<PathBuf, ConfigError> {
	unsafe {
		let program_files_x86 = &*Shell::SHGetKnownFolderPath(&Shell::FOLDERID_ProgramFilesX86, Shell::KNOWN_FOLDER_FLAG(0), HANDLE::default())?.to_string()?;
		let mut path: PathBuf = [program_files_x86, r"Steam\steamapps\common\TowerClimb"].iter().collect();
		// give up if installion dir doesn't exist
		if !path.is_dir() {
			return Err(ConfigError::TowerclimbNotFound);
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
			None => Err(ConfigError::TowerclimbNotFound),
		}
	}
}

/// Should be idempotent
#[instrument]
pub async fn first_time_setup() -> Result<(), ConfigError> {
	#[cfg(feature = "bundled-dllreader")]
	{
		fs::create_dir_all(get_mods_dir_path()).await?;
		fs::create_dir_all(get_cache_dir_path()).await?;
		fs::write(get_dllreader_path(), get_dllreader_exe_bytes()).await?;
		Ok(())
	}
	#[cfg(not(feature = "bundled-dllreader"))]
	Err(ConfigError::NoDllReader)
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

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
	#[error("Could not find TowerClimb executable")]
	TowerclimbNotFound,
	#[error("This build was not compiled with bundled dllreader")]
	NoDllReader,
	#[error("{0}")]
	WindowsError(#[from] windows::core::Error),
	#[error("{0}")]
	FromUtf16Error(#[from] std::string::FromUtf16Error),
	#[error("{0}")]
	FromUtf8Error(#[from] std::string::FromUtf8Error),
	#[error("{0}")]
	TomlDeError(#[from] toml::de::Error),
	#[error("{0}")]
	IoError(#[from] std::io::Error),
}

static MATCH_OPTIONS: glob::MatchOptions = glob::MatchOptions {
	require_literal_separator: true,
	require_literal_leading_dot: true,
	case_sensitive: false,
};
