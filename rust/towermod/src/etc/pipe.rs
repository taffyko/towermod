use windows::{core::w, Win32::{Foundation::{CloseHandle, GENERIC_READ, GENERIC_WRITE, HANDLE}, Storage::FileSystem::{CreateFileW, ReadFile, WriteFile, FILE_ATTRIBUTE_NORMAL, FILE_SHARE_MODE, OPEN_EXISTING, PIPE_ACCESS_DUPLEX}, System::Pipes::{ConnectNamedPipe, CreateNamedPipeW, PIPE_READMODE_MESSAGE, PIPE_TYPE_MESSAGE, PIPE_UNLIMITED_INSTANCES, PIPE_WAIT}}};
use anyhow::Result;

use super::OpenedHandle;

fn write_to_pipe(msg: &[u8]) -> Result<()> {
	unsafe {
		let handle = CreateFileW(
			w!("\\\\.\\pipe\\towermodipc"),
			(GENERIC_READ | GENERIC_WRITE).0,
			FILE_SHARE_MODE::default(),
			None,
			OPEN_EXISTING,
			FILE_ATTRIBUTE_NORMAL,
			HANDLE::default(),
		)?;
		let handle = OpenedHandle(handle);

		WriteFile(handle.0, Some(msg), None, None)?;

		Ok(())
	}
}

fn listen_pipe() -> Result<!> {
	unsafe {
		let mut handle = OpenedHandle(HANDLE::default());
		let mut buffer = [0u8; 4096];
		handle.0 = CreateNamedPipeW(
			w!("\\\\.\\pipe\\towermodipc"),
			PIPE_ACCESS_DUPLEX,
			PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT,
			PIPE_UNLIMITED_INSTANCES,
			4096,
			4096,
			0,
			None,
		);

		loop {
			ConnectNamedPipe(handle.0, None)?;
			let mut bytes = Vec::with_capacity(4096);
			loop {
				let mut bytes_read = 0;
				ReadFile(handle.0, Some(&mut buffer), Some(&mut bytes_read), None)?;
				if bytes_read == 0 {
					break;
				}
				bytes.extend_from_slice(&buffer[..bytes_read as usize]);
			}
			let msg = std::str::from_utf8(&bytes)?;
			print!("{}", msg);
			exec_command(msg);
		}
	}
}

fn exec_command(msg: &str) {
	// TODO: Dispatch appropriate task/event
	// TODO: Handle startup commands from argv

	// tauri::async_runtime::spawn(task)
	todo!()
}
