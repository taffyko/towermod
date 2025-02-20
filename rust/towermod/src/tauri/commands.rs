use std::path::{Path, PathBuf};
use tauri::{command, AppHandle, Emitter};
use anyhow::Result;
use fs_err::tokio as fs;
use towermod_cstc::ImageMetadata;
use towermod_shared::{app::state::{data_state::JsCstcData}, FileDialogOptions, ModInfo, ModType, PluginData, Project, ProjectType};
use towermod_util::log_on_error;

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
pub const fn get_version() -> &'static str { towermod_util::VERSION }

#[command]
pub fn get_cache_dir_path() -> PathBuf { towermod_shared::get_cache_dir_path() }

#[command]
pub fn get_towermod_dir_path() -> PathBuf { towermod_shared::get_towermod_dir_path() }

#[command]
pub fn mod_cache_dir_path(mod_subpath: &Path) -> PathBuf { towermod_shared::mod_cache_dir_path(mod_subpath) }

#[command]
pub fn mod_runtime_dir_path(mod_name: &Path) -> PathBuf { towermod_shared::mod_runtime_dir_path(mod_name) }

#[command]
pub fn get_mods_dir_path() -> PathBuf { towermod_shared::get_mods_dir_path() }

#[command]
pub fn get_default_project_dir_path() -> PathBuf { towermod_shared::get_default_project_dir_path() }

#[command]
pub fn open_folder(dir: &Path) -> Result<()> { towermod_shared::open_folder(dir) }

#[command]
pub async fn folder_picker(options: Option<FileDialogOptions>) -> Result<Option<PathBuf>> { towermod_shared::folder_picker(options).await }

#[command]
pub async fn file_picker(options: Option<FileDialogOptions>) -> Result<Option<PathBuf>> { towermod_shared::file_picker(options).await }

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

use towermod_shared::app::{selectors, thunks};

static INITIALIZED: std::sync::Mutex<bool> = std::sync::Mutex::new(false);
#[command]
pub async fn init(app: AppHandle) -> Result<()> {
	let result = towermod_shared::app::thunks::init().await;

	if (!*INITIALIZED.lock().unwrap()) {
		{
			let mut initialized = INITIALIZED.lock().unwrap();
			*initialized = true;
		}

		// Install mods passed from the command-line
		let args: Vec<String> = std::env::args().skip(1).collect();
		for arg in args {
			log_on_error(app.emit("towermod/request-install-mod", arg));
		}

		// Attempt to listen on pipe
		std::thread::spawn(move || {
			let app_handle = app;
			log_on_error(towermod_win32::pipe::listen_pipe(move |msg| {
				log_on_error(app_handle.emit("towermod/request-install-mod", msg));
			}));
		});
	}

	result
}


#[command]
pub async fn get_game() -> Option<towermod_shared::Game> { selectors::get_game().await }
#[command]
pub async fn get_config() -> towermod_shared::app::state::TowermodConfig { selectors::get_config().await }
#[command]
pub async fn get_project() -> Option<towermod_shared::Project> {
	selectors::get_project().await
}

#[command]
pub async fn is_data_loaded() -> bool {
	selectors::is_data_loaded().await
}

#[command]
pub async fn get_editor_plugin(id: i32) -> Option<PluginData> {
	selectors::get_editor_plugin(id).await
}

#[command]
pub async fn get_image_metadata(id: i32) -> Option<ImageMetadata> {
	selectors::get_image_metadata(id).await
}

#[command]
pub async fn get_data() -> Option<JsCstcData> {
	selectors::get_data().await
}

#[command]
pub async fn update_data(new_data: JsCstcData) {
	thunks::update_data(new_data).await
}

#[command]
pub async fn is_image_overridden(id: i32) -> Result<bool> {
	thunks::is_image_overridden(id).await
}

#[command]
pub async fn set_image_metadata(data: ImageMetadata) {
	thunks::set_image_metadata(data).await
}

#[command]
pub async fn image_dump_dir_path() -> Result<Option<PathBuf>> {
	thunks::image_dump_dir_path().await
}

#[command]
pub async fn new_project() -> Result<()> {
	thunks::new_project().await
}

#[command]
pub async fn load_project_preflight(manifest_path: PathBuf) -> Result<Option<String>> {
	thunks::load_project_preflight(manifest_path).await
}

#[command]
pub async fn load_project(manifest_path: PathBuf) -> Result<()> {
	thunks::load_project(manifest_path).await
}

#[command]
pub async fn save_project(dir_path: PathBuf) -> Result<()> {
	thunks::save_project(dir_path).await
}

#[command]
pub async fn edit_project_info(project: Project) {
	thunks::edit_project_info(project).await
}

#[command]
pub async fn nuke_cache() -> Result<()> {
	thunks::nuke_cache().await
}

#[command]
pub async fn clear_game_cache() -> Result<()> {
	thunks::clear_game_cache().await
}

#[command]
pub async fn export_mod(mod_type: ModType) -> Result<()> {
	thunks::export_mod(mod_type).await
}

#[command]
pub async fn export_from_files(project: Project) -> Result<()> {
	thunks::export_from_files(project).await
}

#[command]
pub async fn export_from_legacy(patch_path: PathBuf, project: Project) -> Result<()> {
	thunks::export_from_legacy(patch_path, project).await
}

#[command]
pub async fn load_manifest(manifest_path: PathBuf, project_type: ProjectType) -> Result<Project> {
	thunks::load_manifest(manifest_path, project_type).await
}

#[command]
pub async fn play_mod(zip_path: PathBuf) -> Result<u32> {
	thunks::play_mod(zip_path).await
}

#[command]
pub async fn play_project(debug: bool) -> Result<u32> {
	thunks::play_project(debug).await
}

#[command]
pub async fn play_vanilla() -> Result<u32> {
	thunks::play_vanilla().await
}

#[command]
pub async fn install_mod(resource: &str) -> Result<ModInfo> { thunks::install_mod(resource).await }

#[command]
pub async fn set_game(file_path: Option<PathBuf>) -> Result<()> { thunks::set_game(file_path).await }

#[command]
pub async fn get_installed_mods() -> Result<Vec<ModInfo>> {
	thunks::get_installed_mods().await
}

#[command]
pub async fn load_config() -> Result<()> {
	thunks::load_config().await
}

#[command]
pub async fn save_config() -> Result<()> {
	thunks::save_config().await
}

#[command]
pub async fn dump_images() -> Result<()> {
	thunks::dump_images().await
}

#[command]
pub async fn mod_cache_exists(mod_info: ModInfo) -> bool {
	thunks::mod_cache_exists(mod_info)
}

#[command]
pub async fn clear_mod_cache(mod_info: ModInfo) -> Result<()> { thunks::clear_mod_cache(mod_info).await }

#[command]
pub async fn wait_until_process_exits(pid: u32) -> Result<()> {
	thunks::wait_until_process_exits(pid).await
}
