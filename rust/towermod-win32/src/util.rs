use windows::Win32::Foundation::{CloseHandle, HANDLE};

pub struct OpenedHandle(pub HANDLE);

impl Drop for OpenedHandle {
	fn drop(&mut self) {
		unsafe {
			if let Err(e) = CloseHandle(self.0) { log::error!("{}", e) }
		}
	}
}
