use tauri::{AppHandle, Emitter};
use anyhow::Result;
use towermod_shared::towermod_util;
use towermod_util::log_on_error;

/// Log error, send error event to the frontend
fn notify_error(app: &AppHandle, err: anyhow::Error) -> Result<()> {
	log::error!("{:?}", &err);
	let err = serde_json::to_string(&err)?;
	let obj: serde_json::Value = serde_json::from_str(&err)?;
	app.emit("towermod/error", obj)?;
	Ok(())
}

/// On error, send an error event to the frontend.
/// If the event can't be sent, log it.
pub fn notify_on_error<T>(app: &AppHandle, result: std::result::Result<T, impl Into<anyhow::Error>>) -> Option<T> {
	match result.map_err(|e| -> anyhow::Error { e.into() }) {
		Ok(v) => Some(v),
		Err(e) => {
			log_on_error(notify_error(app, e));
			None
		}
	}
}
