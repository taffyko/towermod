use super::commands;

// tauri_bindgen_host::generate!({
//     path: "../../greet.wit",
//     async: false,
//     tracing: true
// });

// #[derive(Clone, Copy)]
// struct GreetCtx;

// impl greet::Greet for GreetCtx {
// 	fn greet(&self, name: String) -> String {
// 			format!(
// 					"Hello, {}! You've been greeted from code-generated Rust!",
// 					name
// 			)
// 	}
// }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	// let mut router: Router<GreetCtx> = Router::new(GreetCtx {});
	// greet::add_to_router(&mut router, |ctx| ctx).unwrap();

	tauri::Builder::default()
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
		.plugin(tauri_plugin_opener::init())
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
				commands::get_data,
				commands::update_data,
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
			]
		)
		// TODO: once tauri-bindgen properly supports windows
		// .ipc_router(router)
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
