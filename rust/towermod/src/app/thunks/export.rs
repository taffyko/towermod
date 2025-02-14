use std::{collections::HashMap, io::{Cursor, Read, Write}, path::{Path, PathBuf}, sync::Mutex};
use crate::{app::state::{AppAction, ConfigAction, DataAction, TowermodConfig, STORE}, async_cleanup, convert_to_release_build, cstc::{self, plugin::PluginData, *}, first_time_setup, get_appdata_dir_path, get_mods_dir_path, get_temp_file, log_error, zip_merge_copy_into, Game, GameType, ModInfo, ModType, Nt, PeResource, Project, ProjectType, TcrepainterPatch, ZipWriterExt};
use anyhow::Result;
use async_scoped::TokioScope;
use tauri::command;
use anyhow::{Context};
use fs_err::tokio as fs;
use futures::StreamExt;
use tokio::{io::AsyncWriteExt, sync::RwLock};
use tracing::instrument;
use crate::app::{state::{select, CstcData}, selectors, thunks};

/// For prepopulating the project-details form for exporting Legacy/FilesOnly projects
#[command]
pub async fn load_manifest(manifest_path: PathBuf, project_type: ProjectType) -> Result<Project> {
	if manifest_path.exists() {
		return Ok(Project::from_path(&manifest_path).await?)
	} else {
		let game = selectors::get_game().await.context("No game set")?;
		let mut project = Project::new("".to_string(), "".to_string(), "".to_string(), "".to_string(), game);
		project.dir_path = Some(manifest_path.parent().context("path error")?.to_path_buf());
		project.project_type = project_type;
		return Ok(project)
	}
}

#[command]
pub async fn export_from_files(mut project: Project) -> Result<()> {
	project.date = time::OffsetDateTime::now_utc().replace_nanosecond(0)?.replace_second(0)?;
	crate::export_from_files(&project).await?;
	project.save().await?;
	Ok(())
}

#[command]
pub async fn export_from_legacy(patch_path: PathBuf, mut project: Project) -> Result<()> {
	// take a path to a patch.zip or patch.json
	// expect "files" dir in same directory
	// treat directory of file path as a project dir (copy logo/etc. there)
	crate::export_from_legacy(patch_path, &mut project).await?;
	project.save().await?;
	Ok(())
}

#[command]
pub async fn play_project() {
	todo!()
}
