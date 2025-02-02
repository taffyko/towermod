use std::path::PathBuf;
use tauri::command;
use anyhow::Result;

use crate::{app::thunks, app::selectors, Game, Nt};

// #[command]
// pub fn greet(name: &str) -> String {
// 	format!("Hello, {}! You've been greeted from Rust!", name)
// }

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
