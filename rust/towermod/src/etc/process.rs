use windows::Win32::System::Threading::{OpenProcess, WaitForSingleObject, INFINITE, PROCESS_SYNCHRONIZE};
use windows::Win32::Foundation as win;
use anyhow::Result;
use crate::OpenedHandle;

pub fn wait_until_process_exits(pid: u32) -> Result<()> {
	unsafe {
		let handle = OpenProcess(PROCESS_SYNCHRONIZE, false, pid)?;
		if (handle == win::INVALID_HANDLE_VALUE) {
			anyhow::bail!("Failed to get handle for process {}", pid);
		}
		let handle = OpenedHandle(handle);

		log::info!("Waiting for process {} to exit", pid);
		WaitForSingleObject(handle.0, INFINITE);
		log::info!("Process {} exited", pid);

		Ok(())
	}
}
