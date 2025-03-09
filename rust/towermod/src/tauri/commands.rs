use std::{collections::HashMap, path::{Path, PathBuf}};
use tauri::{command, AppHandle, Emitter};
use anyhow::Result;
use fs_err::tokio as fs;
use towermod_cstc::ImageMetadata;
use towermod_shared::{app::{selectors::SearchOptions, state::{dispatch, select, DataAction}}, cstc_editing, select, FileDialogOptions, ModInfo, ModType, PluginData, Project, ProjectType };
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
pub async fn get_editor_plugin(id: i32) -> Option<PluginData> { selectors::get_editor_plugin(id).await }
#[command]
pub async fn get_editor_plugins() -> HashMap<i32, PluginData> { selectors::get_editor_plugins().await }

#[command]
pub async fn get_image_metadata(id: i32) -> Option<ImageMetadata> {
	selectors::get_image_metadata(id).await
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


#[command] pub async fn get_object_types() -> Vec<i32> {
	selectors::get_object_types().await
}
#[command] pub async fn get_object_type(id: i32) -> Option<cstc_editing::EdObjectType> {
	let object_type = selectors::get_object_type(id).await?;
	let plugin_name = selectors::select_editor_plugin_name(object_type.plugin_id).await?;
	let value = serde_json::value::to_value(object_type).ok()?;
	{
		let value = value.as_object_mut()?;
		value.insert(String::from("pluginName"), plugin_name);
	}
	todo!()
}
#[command] pub async fn search_object_types(options: SearchOptions) -> Vec<(i32, String)> {
	selectors::search_object_types(options).await
}
#[command] pub async fn update_object_type(obj: cstc_editing::EdObjectType) {
	dispatch(DataAction::UpdateObjectType(obj)).await
}
#[command] pub async fn get_object_type_image_id(id: i32) -> Option<i32> {
	select(selectors::select_object_type_image_id(id)).await
}
#[command] pub async fn create_object_type(plugin_id: i32) -> i32 {
	let id = select(selectors::select_new_object_type_id()).await;
	dispatch(DataAction::CreateObjectType { id, plugin_id }).await;
	id
}
#[command] pub async fn delete_object_type(id: i32) {
	dispatch(DataAction::DeleteObjectType(id)).await
}
#[command] pub async fn object_type_add_variable(id: i32, name: String, value: cstc_editing::VariableValue) {
	dispatch(DataAction::ObjectTypeAddVariable { id, name, value }).await
}
#[command] pub async fn object_type_delete_variable(id: i32, name: String) {
	dispatch(DataAction::ObjectTypeDeleteVariable { id, name }).await
}

#[command] pub async fn get_object_instances(layout_layer_id: i32) -> Vec<i32> {
	select(selectors::select_object_instance_ids(layout_layer_id)).await
}
#[command] pub async fn get_object_type_instances(object_type_id: i32) -> Vec<i32> {
	select(selectors::select_object_type_instance_ids(object_type_id)).await
}
#[command] pub async fn get_object_instance(id: i32) -> Option<cstc_editing::EdObjectInstance> {
	select!(selectors::select_object_instance(id), |r| r.cloned()).await
}
#[command] pub async fn search_object_instances(options: SearchOptions) -> Vec<(i32, String)> {
	selectors::search_object_instances(options).await
}
#[command] pub async fn update_object_instance(obj: cstc_editing::EdObjectInstance) {
	dispatch(DataAction::UpdateObjectInstance(obj)).await
}
#[command] pub async fn get_object_instance_image_id(id: i32) -> Option<i32> {
	select(selectors::select_object_instance_image_id(id)).await
}
#[command] pub async fn create_object_instance(object_type_id: i32, layout_layer_id: i32) -> i32 {
	let id = select(selectors::select_new_object_instance_id()).await;
	dispatch(DataAction::CreateObjectInstance { id, object_type_id, layout_layer_id }).await;
	id
}
#[command] pub async fn delete_object_instance(id: i32) {
	dispatch(DataAction::DeleteObjectInstance(id)).await
}

#[command] pub async fn get_layouts() -> Vec<String> {
	select(selectors::select_layouts()).await
}
#[command] pub async fn get_layout(name: String) -> Option<cstc_editing::EdLayout> {
	select!(selectors::select_layout(name), |r| r.map(|l| {
		let cstc_editing::EdLayout { name, width, height, color, unbounded_scrolling, application_background, data_keys, layers: _, image_ids, texture_loading_mode } = l;
		cstc_editing::EdLayout { name: name.clone(), width: width.clone(), height: height.clone(), color: color.clone(), unbounded_scrolling: unbounded_scrolling.clone(), application_background: application_background.clone(), data_keys: data_keys.clone(), layers: Default::default(), image_ids: image_ids.clone(), texture_loading_mode: texture_loading_mode.clone() }
	})).await
}
#[command] pub async fn update_layout(layout: cstc_editing::EdLayout) {
	dispatch(DataAction::UpdateLayout(layout)).await
}

#[command] pub async fn get_layout_layers(layout_name: String) -> Vec<i32> {
	select(selectors::select_layout_layers(layout_name)).await
}
#[command] pub async fn get_layout_layer(id: i32) -> Option<cstc_editing::EdLayoutLayer> {
	select!(selectors::select_layout_layer(id), |r| r.map(|l| {
		let cstc_editing::EdLayoutLayer { id, name, layer_type, filter_color, opacity, angle, scroll_x_factor, scroll_y_factor, scroll_x, scroll_y, zoom_x_factor, zoom_y_factor, zoom_x, zoom_y, clear_background_color, background_color, force_own_texture, sampler, enable_3d, clear_depth_buffer, objects: _ } = l;
		cstc_editing::EdLayoutLayer { id: id.clone(), name: name.clone(), layer_type: layer_type.clone(), filter_color: filter_color.clone(), opacity: opacity.clone(), angle: angle.clone(), scroll_x_factor: scroll_x_factor.clone(), scroll_y_factor: scroll_y_factor.clone(), scroll_x: scroll_x.clone(), scroll_y: scroll_y.clone(), zoom_x_factor: zoom_x_factor.clone(), zoom_y_factor: zoom_y_factor.clone(), zoom_x: zoom_x.clone(), zoom_y: zoom_y.clone(), clear_background_color: clear_background_color.clone(), background_color: background_color.clone(), force_own_texture: force_own_texture.clone(), sampler: sampler.clone(), enable_3d: enable_3d.clone(), clear_depth_buffer: clear_depth_buffer.clone(), objects: Default::default() }
	})).await
}
#[command] pub async fn search_layout_layers(options: SearchOptions) -> Vec<(i32, String)> {
	selectors::search_layout_layers(options).await
}
#[command] pub async fn update_layout_layer(layer: cstc_editing::EdLayoutLayer) {
	dispatch(DataAction::UpdateLayoutLayer(layer)).await
}

#[command] pub async fn get_root_animations() -> Vec<i32> {
	select(selectors::select_root_animations()).await
}
#[command] pub async fn get_animation_children(id: i32) -> Vec<i32> {
	select(selectors::select_animation_children(id)).await
}
#[command] pub async fn get_animation(id: i32) -> Option<towermod_cstc::Animation> {
	select!(selectors::select_animation(id), |r| r.map(|a| {
		let towermod_cstc::Animation { id, name, tag, speed, is_angle, angle, repeat_count, repeat_to, ping_pong, frames, sub_animations: _ } = a;
		towermod_cstc::Animation { id: id.clone(), name: name.clone(), tag: tag.clone(), speed: speed.clone(), is_angle: is_angle.clone(), angle: angle.clone(), repeat_count: repeat_count.clone(), repeat_to: repeat_to.clone(), ping_pong: ping_pong.clone(), frames: frames.clone(), sub_animations: Default::default() }
	})).await
}
#[command] pub async fn update_animation(animation: towermod_cstc::Animation) {
	dispatch(DataAction::UpdateAnimation(animation)).await
}

#[command] pub async fn get_behaviors() -> Vec<(i32, i32)> {
	select(selectors::select_behaviors()).await
}
#[command] pub async fn get_behavior(object_type_id: i32, mov_index: i32) -> Option<towermod_cstc::Behavior> {
	select!(selectors::select_behavior(object_type_id, mov_index), |r| r.cloned()).await
}
#[command] pub async fn update_behavior(behavior: towermod_cstc::Behavior) {
	dispatch(DataAction::UpdateBehavior(behavior)).await
}

#[command] pub async fn get_containers() -> Vec<i32> {
	select(selectors::select_containers()).await
}
#[command] pub async fn get_container(id: i32) -> Option<cstc_editing::EdContainer> {
	select!(selectors::select_container(id), |r| r.cloned()).await
}
#[command] pub async fn update_container(container: cstc_editing::EdContainer) {
	dispatch(DataAction::UpdateContainer(container)).await
}
#[command] pub async fn create_container(object_type_id: i32) {
	dispatch(DataAction::CreateContainer(object_type_id)).await
}
#[command] pub async fn delete_container(object_type_id: i32) {
	dispatch(DataAction::DeleteContainer(object_type_id)).await
}
#[command] pub async fn search_containers(options: SearchOptions) -> Vec<(i32, String)> {
	select(selectors::search_containers(options)).await
}

#[command] pub async fn get_families() -> Vec<String> {
	select!(selectors::select_families(), |r| r.into_iter().map(|name| name.clone()).collect()).await
}
#[command] pub async fn get_family(name: String) -> Option<cstc_editing::EdFamily> {
	select!(selectors::select_family(name), |r| r.cloned()).await
}
#[command] pub async fn family_add_object(name: String, object_type_id: i32) {
	dispatch(DataAction::FamilyAddObject { name, object_type_id }).await
}
#[command] pub async fn family_remove_object(name: String, object_type_id: i32) {
	dispatch(DataAction::FamilyRemoveObject { name, object_type_id }).await
}
#[command] pub async fn family_add_variable(name: String, var_name: String, value: cstc_editing::VariableValue) {
	dispatch(DataAction::FamilyAddVariable { name, var_name, value }).await
}
#[command] pub async fn family_delete_variable(name: String, var_name: String) {
	dispatch(DataAction::FamilyDeleteVariable { name, var_name }).await
}

#[command] pub async fn get_traits() -> Vec<String> {
	select!(selectors::select_traits(), |r| r.into_iter().map(|name| name.clone()).collect()).await
}
#[command] pub async fn get_trait(name: String) -> Option<towermod_cstc::ObjectTrait> {
	select!(selectors::select_trait(name), |r| r.cloned()).await
}
#[command] pub async fn update_trait(object_trait: towermod_cstc::ObjectTrait) {
	dispatch(DataAction::UpdateTrait(object_trait)).await
}
#[command] pub async fn create_trait(name: String) {
	dispatch(DataAction::CreateTrait(name)).await
}

#[command] pub async fn get_app_block() -> Option<cstc_editing::EdAppBlock> {
	select(|s| s.data.app_block.as_ref().cloned()).await
}
#[command] pub async fn update_app_block(app_block: cstc_editing::EdAppBlock) {
	dispatch(DataAction::UpdateAppBlock(app_block)).await;
}


