use std::path::PathBuf;

use tracing::instrument;
use windows::{core::HSTRING, Win32::{Foundation::{CloseHandle, HANDLE, MAX_PATH}, Storage::FileSystem::GetTempFileNameW}};
use anyhow::Result;

pub struct OpenedHandle(pub HANDLE);

#[instrument]
pub async fn get_temp_file() -> Result<PathBuf> {
	unsafe {
		let buffer = tokio::task::spawn_blocking(|| {
			let mut buffer = [0u16; MAX_PATH as usize];
			GetTempFileNameW(
				&HSTRING::from(&*std::env::temp_dir().as_path()),
				&HSTRING::from("tow"),
				0,
				&mut buffer
			);
			buffer
		}).await?;
		let len = buffer.iter().position(|v| *v == 0).unwrap();
		let s = String::from_utf16_lossy(&buffer[0..len]);
		Ok(s.into())
	}
}

impl Drop for OpenedHandle {
	fn drop(&mut self) {
		unsafe {
			if let Err(e) = CloseHandle(self.0) { log::error!("{}", e) }
		}
	}
}
