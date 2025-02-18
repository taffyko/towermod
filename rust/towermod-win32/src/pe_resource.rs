use core::slice;
use std::cell::RefCell;
use std::collections::HashMap;
use std::ffi::c_void;
use std::fmt::Debug;

use towermod_util::{async_cleanup, blocking, clone};
use std::path::Path;
use log::warn;
use tokio::task::JoinSet;
use tracing::instrument;
use windows::Win32::System::LibraryLoader::{BeginUpdateResourceW, EndUpdateResourceW, EnumResourceNamesW, EnumResourceTypesExW, FindResourceExW, LoadLibraryExW, LoadResource, LockResource, SizeofResource, UpdateResourceW, LOAD_LIBRARY_AS_DATAFILE};
use anyhow::Result;
use windows::Win32::Foundation::{HANDLE, HMODULE, BOOL, FreeLibrary};
use windows::core::{PCWSTR, HSTRING};

pub unsafe fn read_hmodule_resource(hmodule: HMODULE, res_type: &ResId, res_name: &ResId) -> Result<Vec<u8>> {
	unsafe {
		let hres = FindResourceExW(hmodule, res_type, res_name, 0x00);
		let hresdata = LoadResource(hmodule, hres)?;
		let pdata = LockResource(hresdata);
		let dw_size = SizeofResource(hmodule, hres);
		let bytes = slice::from_raw_parts(pdata as *const u8, dw_size as usize).to_owned();
		Ok(bytes)
	}
}

pub fn read_pe_file_resource(exe_path: &Path, res_type: &ResId, res_name: &ResId) -> Result<Vec<u8>> {
	unsafe {
		let hmodule = LoadLibraryExW(&HSTRING::from(exe_path), HANDLE::default(), LOAD_LIBRARY_AS_DATAFILE)?;
		scopeguard::defer! { if let Err(e) = FreeLibrary(hmodule) { log::error!("{}", e) }; }
		read_hmodule_resource(hmodule, res_type, res_name)
	}
}

#[instrument(skip(buffer))]
pub fn replace_pe_file_resource(exe_path: &Path, res_type: &ResId, res_name: &ResId, buffer: &[u8]) -> Result<()> {
	unsafe {
		let buffer_ptr = buffer as *const _ as *const c_void;
		let hupdate = BeginUpdateResourceW(&HSTRING::from(exe_path.as_os_str()), BOOL(0))?;
		// Integer resource ID names (u16 only) are passed by casting them to a PCWSTR pointer
		UpdateResourceW(hupdate, res_type, res_name, 0x00, Some(buffer_ptr), buffer.len() as u32)?;
		EndUpdateResourceW(hupdate, BOOL(0))?;
		log::info!("Updated {:?} for {}", res_type, exe_path.to_string_lossy());
	}
	Ok(())
}

/// Throws an error if the resource does not already exist
#[instrument]
pub fn delete_pe_file_resource(exe_path: &Path, res_type: &ResId, res_name: &ResId) -> Result<()> {
	unsafe {
		let hupdate = BeginUpdateResourceW(&HSTRING::from(exe_path.as_os_str()), BOOL(0))?;
		UpdateResourceW(hupdate, res_type, res_name, 0x00, None, 0)?;
		EndUpdateResourceW(hupdate, BOOL(0))?;
	}
	Ok(())
}


thread_local!(static RESOURCE_NAMES_ACC: RefCell<Vec<ResId>> = RefCell::new(vec![]));
#[instrument]
pub unsafe fn list_hmodule_resource_names(hmodule: HMODULE, res_type: &ResId) -> Result<Vec<ResId>> {
	RESOURCE_NAMES_ACC.with_borrow_mut(|v| *v = vec![]);
	extern "system" fn cb(_hmodule: HMODULE, _res_type: PCWSTR, res_name: PCWSTR, _lparam: isize) -> BOOL {
		RESOURCE_NAMES_ACC.with_borrow_mut(|v| v.push(ResId::try_from(res_name).unwrap()));
		BOOL(1)
	}
	unsafe {
		EnumResourceNamesW(hmodule, res_type, Some(cb), 0);
		Ok(RESOURCE_NAMES_ACC.with_borrow_mut(|v| v.clone()))
	}
}
pub const LANGID_DEFAULT: u16 = 1033;
#[allow(unused)]
pub const LANGID_ENGLISH_UK: u16 = 2057;
pub const RES_TYPE_STRING_TABLE: u16 = 6;

thread_local!(static RESOURCE_TYPES_ACC: RefCell<Vec<ResId>> = RefCell::new(vec![]));
pub unsafe fn list_hmodule_resource_types(hmodule: HMODULE) -> Result<Vec<ResId>> {
	RESOURCE_TYPES_ACC.with_borrow_mut(|v| *v = vec![]);
	extern "system" fn cb(_hmodule: HMODULE, res_type: PCWSTR, _lparam: isize) -> BOOL {
		RESOURCE_TYPES_ACC.with_borrow_mut(|v| v.push(ResId::try_from(res_type).unwrap()));
		BOOL(1)
	}
	unsafe {
		EnumResourceTypesExW(hmodule, Some(cb), 0, 0, LANGID_DEFAULT)?;
		Ok(RESOURCE_TYPES_ACC.with_borrow_mut(|v| v.clone()))
	}
}

/// Type for representing PE resource IDs using strings or integers (in lieu of the MAKEINTRESOURCE() win32 macro)
#[derive(Debug, Clone)]
pub enum ResId {
	String(HSTRING),
	Int(u16),
}
impl From<&str> for ResId {
	fn from(value: &str) -> Self {
		Self::String(HSTRING::from(value))
	}
}
impl From<u16> for ResId {
	fn from(value: u16) -> Self {
		Self::Int(value)
	}
}
impl TryFrom<PCWSTR> for ResId {
	type Error = anyhow::Error;
	fn try_from(value: PCWSTR) -> Result<Self, Self::Error> {
		if (value.0 as usize) > ((1 << 16) - 1) {
			Ok(Self::String(HSTRING::from_wide(unsafe { value.as_wide() })?))
		} else {
			Ok(Self::Int(value.0 as u16))
		}
	}
}

impl From<&ResId> for PCWSTR {
	fn from(value: &ResId) -> Self {
		match value {
			ResId::String(hstring) => PCWSTR(hstring.as_ptr()),
			ResId::Int(i) => PCWSTR((*i as usize) as *const _),
		}
	}
}
impl windows::core::IntoParam<PCWSTR, windows::core::CopyType> for &ResId {
	fn into_param(self) -> windows::core::Param<PCWSTR> {
		match self {
			ResId::String(hstring) => hstring.into_param(),
			ResId::Int(i) => PCWSTR((*i as usize) as *const _).into_param(),
		}
	}
}
impl TryFrom<&ResId> for String {
	type Error = ();
	fn try_from(value: &ResId) -> Result<Self, Self::Error> {
		if let ResId::String(hstring) = value {
			return Ok(hstring.to_string());
		}
		Err(())
	}
}

/// Extract the runtime .csx plugin builds embedded in the game executable
#[instrument]
pub async fn read_dllblock_bins<T: AsRef<Path> + Debug>(exe_path: T) -> Result<HashMap<i32, Vec<u8>>> {
	let exe_path = exe_path.as_ref().to_owned();
	unsafe {
		let hmodule = blocking!(LoadLibraryExW(&HSTRING::from(&*exe_path), HANDLE::default(), LOAD_LIBRARY_AS_DATAFILE)).await??;
		async_cleanup! {
			do { blocking!(FreeLibrary(hmodule)).await??; }
			let res_type = ResId::from("DLLBLOCK");
			let mut plugins = HashMap::new();
			let res_names = blocking!(@(res_type) list_hmodule_resource_names(hmodule, &res_type)).await??;

			let mut set = JoinSet::new();
			for res_name in res_names {
				set.spawn_blocking(clone! { @(res_type, res_name) anyhow::Ok((res_name.clone(), read_hmodule_resource(hmodule, &res_type, &res_name)?)) });
			}
			while let Some(result) = set.join_next().await {
				let (res_name, plugin) = result??;
				let ResId::Int(plugin_idx) = res_name else { panic!() };
				let plugin_idx = (plugin_idx - 1000) as i32;

				plugins.insert(plugin_idx, plugin);
			}
			Ok(plugins)
		}
	}
}
