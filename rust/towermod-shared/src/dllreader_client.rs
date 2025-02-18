use std::{path::{Path, PathBuf}};
use anyhow::Result;
use tokio::process::Command;
use fs_err::tokio as fs;
use towermod_cstc::plugin::PluginData;
use tracing::instrument;

use crate::get_cache_dir_path;

#[cfg(feature = "bundled-dllreader")]
fn get_dllreader_exe_bytes() -> Vec<u8> {
	#[cfg(debug_assertions)]
	let dllreader_exe = fs_err::read(env!("DLLREADER_EXE")).unwrap();
	#[cfg(not(debug_assertions))]
	let dllreader_exe = include_bytes!(env!("DLLREADER_EXE")).to_vec();
	dllreader_exe
}

fn get_dllreader_path() -> PathBuf {
	let mut path = get_cache_dir_path();
	path.push("dllreader.exe");
	path
}

pub async fn extract_dllreader() -> Result<()> {
	#[cfg(feature = "bundled-dllreader")]
	{
		fs::write(get_dllreader_path(), get_dllreader_exe_bytes()).await?;
		Ok(())
	}
	#[cfg(not(feature = "bundled-dllreader"))]
	anyhow::bail!("This build was not compiled with bundled dllreader");
}

#[instrument]
pub async fn remote_read_editor_plugin<T: AsRef<Path> + std::fmt::Debug>(path: T) -> Result<PluginData> {
	let path = path.as_ref().to_owned();
	let output = Command::new(get_dllreader_path())
		.arg("editorplugin")
		.arg(path)
		.output().await?;
	if !output.status.success() {
		anyhow::bail!("dllreader failed: {}", String::from_utf8_lossy(&output.stderr));
	}
	Ok(rmp_serde::from_slice(&output.stdout)?)
}
