use windows::{core::{w, HRESULT}, Win32::{Foundation::{GENERIC_READ, GENERIC_WRITE, HANDLE}, Storage::FileSystem::{CreateFileW, ReadFile, WriteFile, FILE_ATTRIBUTE_NORMAL, FILE_SHARE_MODE, OPEN_EXISTING, PIPE_ACCESS_DUPLEX}, System::Pipes::{ConnectNamedPipe, CreateNamedPipeW, DisconnectNamedPipe, SetNamedPipeHandleState, WaitNamedPipeW, PIPE_READMODE_MESSAGE, PIPE_TYPE_MESSAGE, PIPE_UNLIMITED_INSTANCES, PIPE_WAIT}}};
use windows::Win32::Foundation as win;
use anyhow::Result;
use towermod_util::log_on_error;
use crate::OpenedHandle;

pub const fn win32_to_hresult(error: u32) -> HRESULT {
	HRESULT(if error == 0 { 0 } else { (error & 0x0000_FFFF) | (7 << 16) | 0x8000_0000 } as i32)
}
const HRESULT_BROKEN_PIPE: HRESULT = win32_to_hresult(win::ERROR_BROKEN_PIPE.0);
const HRESULT_PIPE_BUSY: HRESULT = win32_to_hresult(win::ERROR_PIPE_BUSY.0);
const HRESULT_MORE_DATA: HRESULT = win32_to_hresult(win::ERROR_MORE_DATA.0);

pub fn write_to_pipe(msg: &[u8]) -> Result<()> {
	log::info!("Sending message to pipe");
	unsafe {
		loop {
			let result = CreateFileW(
				w!(r"\\.\pipe\towermod_ipc"),
				(GENERIC_READ | GENERIC_WRITE).0,
				FILE_SHARE_MODE::default(),
				None,
				OPEN_EXISTING,
				FILE_ATTRIBUTE_NORMAL,
				HANDLE::default(),
			);

			let handle = match result {
				Ok(h) => h,
				Err(e) if e.code() == HRESULT_PIPE_BUSY => {
					log::info!("Pipe busy, retrying...");
					continue;
				}
				Err(e) => { Err(e)? }
			};
			let handle = OpenedHandle(handle);

			SetNamedPipeHandleState(handle.0, Some(&PIPE_READMODE_MESSAGE as *const _), None, None)?;

			WriteFile(handle.0, Some(msg), None, None)?;

			return Ok(())
		}
	}
}

pub fn pipe_exists() -> bool {
	unsafe {
		WaitNamedPipeW(w!(r"\\.\pipe\towermod_ipc"), 0).into()
	}
}

pub fn listen_pipe(handler: impl Sync + Send + 'static + Fn(&str) -> ()) -> Result<!> {
	let handler = std::sync::Arc::new(handler);
	unsafe {
		loop {
			let handle = OpenedHandle(CreateNamedPipeW(
				w!(r"\\.\pipe\towermod_ipc"),
				PIPE_ACCESS_DUPLEX,
				PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT,
				PIPE_UNLIMITED_INSTANCES,
				4096,
				4096,
				0,
				None,
			));
			if (handle.0).0 == win::INVALID_HANDLE_VALUE.0 {
				let e = win::GetLastError().unwrap_err();
				log::error!("Could not create pipe: {e:?}");
				Err(e)?;
			}

			log::info!("Pipe {}: Waiting for connection...", handle.0.0);
			if let Err(e) = ConnectNamedPipe(handle.0, None) {
				log::error!("Pipe {}: Failed to connect: {e:?}", handle.0.0);
				continue;
			}
			log::info!("Pipe {}: Connection received", handle.0.0);
			let handler = handler.clone();
			std::thread::spawn(move || pipe_connection_instance(handle, handler));
		}
	}
}

pub fn pipe_connection_instance(handle: OpenedHandle, handler: std::sync::Arc<impl Fn(&str) -> ()>) {
	let mut buffer = [0u8; 256];
	let mut bytes = Vec::with_capacity(256);
	loop {
		let mut bytes_read = 0;
		unsafe {
			if let Err(e) = ReadFile(handle.0, Some(&mut buffer), Some(&mut bytes_read), None) {
				match e.code() {
					HRESULT_MORE_DATA => {}
					HRESULT_BROKEN_PIPE => {
						log::info!("Pipe {}: Connection closed", handle.0.0);
						log_on_error(DisconnectNamedPipe(handle.0));
						break;
					}
					_ => {
						log::error!("Pipe {}: Read failed: {e:?}", handle.0.0);
						log_on_error(DisconnectNamedPipe(handle.0));
						break;
					}
				}
			}
		}
		bytes.extend_from_slice(&buffer[..bytes_read as usize]);
	}
	if let Ok(msg) = std::str::from_utf8(&bytes) {
		log::info!("Message from pipe {}: {}", handle.0.0, msg);
		handler(msg);
	} else {
		log::warn!("Could not decode message from pipe {}", handle.0.0);
	}
}
