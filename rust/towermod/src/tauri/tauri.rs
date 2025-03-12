use super::commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_opener::init())
		.plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_fs::init())
		.setup(|app| {
			let window = tauri::window::WindowBuilder::new(app, "main")
				.title("towermod")
				.inner_size(800., 600.)
				.transparent(true)
				.decorations(false)
				.shadow(false)
				.build()?;
			let mut webview_builder = tauri::webview::WebviewBuilder::new("main", tauri::WebviewUrl::App("index.html".into()))
				.transparent(true);
			#[cfg(debug_assertions)]
			{
				webview_builder = webview_builder
				.additional_browser_args("\
					--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection \
					--remote-debugging-port=9223
				")
				.browser_extensions_enabled(true);
				if let Some(path) = std::env::var("TAURI_EXTENSIONS_DIR").ok() {
					webview_builder = webview_builder.extensions_path(path);
				}
			}
			let _webview = window.add_child(webview_builder, tauri::LogicalPosition::new(0, 0), window.inner_size().unwrap())?;
			Ok(())
		})
		.invoke_handler(
			tauri::generate_handler![
				commands::get_mods_dir_path,
				commands::open_folder,
				commands::file_picker,
				commands::folder_picker,
				commands::get_cache_dir_path,
				commands::get_mods_dir_path,
				commands::get_default_project_dir_path,
				commands::copy_file,
				commands::delete_file,
				commands::get_version,
				commands::get_image,
				commands::get_file,
				commands::get_towermod_dir_path,
				commands::mod_cache_dir_path,
				commands::mod_runtime_dir_path,
				commands::get_game,
				commands::get_config,
				commands::get_project,
				commands::is_data_loaded,
				commands::get_editor_plugin,
				commands::get_editor_plugins,
				commands::get_image_metadata,
				commands::is_image_overridden,
				commands::set_image_metadata,
				commands::image_dump_dir_path,
				commands::new_project,
				commands::load_project_preflight,
				commands::load_project,
				commands::save_project,
				commands::edit_project_info,
				commands::nuke_cache,
				commands::clear_game_cache,
				commands::export_mod,
				commands::export_from_files,
				commands::export_from_legacy,
				commands::load_manifest,
				commands::play_mod,
				commands::play_project,
				commands::play_vanilla,
				commands::install_mod,
				commands::init,
				commands::set_game,
				commands::get_installed_mods,
				commands::load_config,
				commands::save_config,
				commands::dump_images,
				commands::mod_cache_exists,
				commands::clear_mod_cache,
				commands::wait_until_process_exits,

				commands::get_object_types,
				commands::get_object_type,
				commands::search_object_types,
				commands::update_object_type,
				commands::get_object_type_image_id,
				commands::create_object_type,
				commands::delete_object_type,
				commands::object_type_add_variable,
				commands::object_type_delete_variable,

				commands::get_object_instances,
				commands::get_object_type_instances,
				commands::get_object_instance,
				commands::search_object_instances,
				commands::update_object_instance,
				commands::get_object_instance_image_id,
				commands::delete_object_instance,
				commands::create_object_instance,

				commands::get_layouts,
				commands::get_layout,
				commands::update_layout,

				commands::get_layout_layers,
				commands::get_layout_layer,
				commands::search_layout_layers,
				commands::update_layout_layer,

				commands::get_root_animations,
				commands::get_animation_children,
				commands::get_animation,
				commands::get_outliner_object_types,
				commands::get_object_type_animation,
				commands::update_animation,

				commands::get_behaviors,
				commands::get_behavior,
				commands::update_behavior,

				commands::get_container,
				commands::get_containers,
				commands::search_containers,
				commands::update_container,
				commands::create_container,
				commands::delete_container,

				commands::get_families,
				commands::get_family,
				commands::family_add_object,
				commands::family_remove_object,
				commands::family_add_variable,
				commands::family_delete_variable,

				commands::get_traits,
				commands::get_trait,
				commands::update_trait,
				commands::create_trait,

				commands::get_app_block,
				commands::update_app_block,
			]
		)
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
