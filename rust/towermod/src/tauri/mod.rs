use std::path::PathBuf;
use crate::app::{selectors, thunks};

mod commands;
use tauri::{plugin::TauriPlugin, Runtime};
use tauri_bindgen_host::ipc_router_wip::{BuilderExt, Router};

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
				crate::etc::get_mods_dir_path,
				crate::etc::open_folder,
				crate::etc::file_picker,
				commands::get_image,
				selectors::get_game,
				selectors::get_config,
				selectors::is_data_loaded,
				thunks::new_project,
				thunks::export_from_files,
				thunks::export_from_legacy,
				thunks::play_mod,
				thunks::play_project,
				thunks::play_vanilla,
				thunks::init,
				thunks::set_game,
				thunks::get_installed_mods,
				thunks::load_config,
				thunks::save_config
			]
		)
		// TODO: once tauri-bindgen properly supports windows
		// .ipc_router(router)
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
