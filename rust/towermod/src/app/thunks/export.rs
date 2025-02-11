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

#[command]
pub async fn export_from_files() {
	todo!()
}

#[command]
pub async fn export_from_legacy() {

}

#[command]
pub async fn play_project() {
	todo!()
}
