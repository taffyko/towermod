use std::collections::{HashMap, HashSet};
use derivative::Derivative;
use num_derive::FromPrimitive;
use serde::{Serialize, Deserialize};
use serde_alias::serde_alias;


const OBJ_NAME: u32 = 1;
const OBJ_AUTHOR: u32 = 2;
const OBJ_VERSION: u32 = 3;
const OBJ_DESCRIPTION: u32 = 4;
const OBJ_DATE: u32 = 5;
const OBJ_COPYRIGHT: u32 = 6;
const OBJ_WEB: u32 = 7;
const OBJ_EMAIL: u32 = 8;
const OBJ_CATEGORY: u32 = 9;
const OBJ_ICON: u32 = 101;
const OBJ_SICON: u32 = 102;

pub const ACETYPE_CONDITION: i32 = 0;
pub const ACETYPE_ACTION: i32 = 1;
pub const ACETYPE_EXPRESSION: i32 = 2;
pub const ACETYPE_CNDFUNC: i32 = 3;
pub const ACETYPE_ACTFUNC: i32 = 4;
pub const ACETYPE_EXPFUNC: i32 = 5;
pub const ACETYPE_EXPNAME: i32 = 6;

#[repr(i32)]
#[derive(Debug, Copy, Clone, FromPrimitive)]
pub enum ParamType
{
	VALUE = 1,
	STRING,
	COLOR,
	POSITION,
	ZONE,
	OBJECT,
	KEYBOARD,
	MOUSE,
	COMBO,
	UNDEFINED,
	ARRAY,
	LAYER,
	GLOBALVARIABLE,
	PRIVATEVARIABLE,
	MENURESOURCE,
	BINARYRESOURCE,
	TRANSITION,
	CUST1 = 128,
	CUST2,
	CUST3,
	CUST4,
	CUST5,
	CUST6,
	CUST7,
	CUST8,
	CUST9,
	CUST10,
	CUST11,
	CUST12,
	CUST13,
	CUST14,
	CUST15,
	CUST16,
	OPTIONAL = 1 << 8,
	VARIABLE = 1 << 9,
	NOCAST = 1 << 10,
}

#[allow(non_camel_case_types)]
#[repr(i32)]
#[derive(Debug, Clone, Copy, FromPrimitive, Default)]
pub enum Property
{
	PROPERTY_END = -1,
	#[default]
	INVALID = 0,
	PROPERTY_STATIC = 1,
	PROPERTY_TEXT,
	PROPERTY_VALUE,
	PROPERTY_BOOL,
	PROPERTY_COMBO,
	PROPERTY_COLOR,
	PROPERTY_FONT,
	PROPERTY_BUTTON,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]

#[serde(rename_all = "camelCase")]
pub struct PluginStringTable {
	pub name: String,
	pub author: String,
	pub version: String,
	pub desc: String,
	pub category: String,
	pub web: String,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]

#[serde(rename_all = "camelCase")]
pub struct PluginData {
	pub conditions: HashMap<i32, AcesEntry>,
	pub actions: HashMap<i32, AcesEntry>,
	pub expressions: HashMap<i32, AcesEntry>,
	pub cnd_categories: AceCategories,
	pub act_categories: AceCategories,
	pub exp_categories: AceCategories,
	pub properties: Vec<CPropItem>,
	pub string_table: PluginStringTable,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Default, Clone, Serialize, Deserialize)]

#[serde(rename_all = "camelCase")]
pub struct Param {
	pub param_type: u16,
	pub name: String,
	pub desc: String,
	pub init_str: String,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Derivative, Debug, Clone, Serialize, Deserialize)]

#[serde(rename_all = "camelCase")]
#[derivative(Default)]
pub struct AcesEntry {
	/// Deprecated
	pub resource_id: i16,
	pub ace_name: String,
	pub ace_description: String,
	pub retrn: i16,
	pub params: Vec<Param>,
	pub ace_list_name: String,
	pub ace_category: String,
	pub ace_display_text: String,
	pub script_name: String,
	pub aux_str: String,
}

/// AceList entries grouped by Category name
pub type AceCategories = HashMap<String, HashSet<i32>>;

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Default, Clone, Serialize, Deserialize)]

#[serde(rename_all = "camelCase")]
pub struct CPropItem {
	pub prop_type: i32,
	pub label: String,
	pub description: String,
	pub text: String,
}

pub fn sort_categories(aces: &HashMap<i32, AcesEntry>) -> AceCategories {
	let mut cats = AceCategories::new();
	for (id, ace) in aces {
		match cats.get_mut(&ace.ace_category) {
			None => { cats.insert(ace.ace_category.clone(), HashSet::from([*id])); }
			Some(set) => { set.insert(*id); }
		};
	}
	cats
}

// FFI

#[cfg(windows)]
mod ffi {
	use super::*;
	use std::{ffi::CStr, path::Path};
	use anyhow::Result;
	use tokio::{fs, task::JoinSet};
	use tracing::instrument;
	use windows::{core::HSTRING, Win32::{Foundation::{FreeLibrary, HANDLE, HMODULE}, UI::WindowsAndMessaging::LoadStringA}, core::PSTR};
	use windows::Win32::System::LibraryLoader::{LoadLibraryExW, LOAD_LIBRARY_AS_DATAFILE};
	use towermod_util::{blocking, async_cleanup};

	pub unsafe fn read_plugin_string_table(hmodule: HMODULE) -> Result<PluginStringTable> {
		unsafe {
			let mut buffer: [u8; 1024] = [0; 1024];
			let ptr = PSTR(&mut buffer as *mut u8);
			LoadStringA(hmodule, OBJ_NAME, ptr, 1023);
			let name: String = CStr::from_bytes_until_nul(&buffer[..])?.to_string_lossy().into_owned();
			LoadStringA(hmodule, OBJ_AUTHOR, ptr, 1023);
			let author: String = CStr::from_bytes_until_nul(&buffer[..])?.to_string_lossy().into_owned();
			LoadStringA(hmodule, OBJ_VERSION, ptr, 1023);
			let version: String = CStr::from_bytes_until_nul(&buffer[..])?.to_string_lossy().into_owned();
			LoadStringA(hmodule, OBJ_DESCRIPTION, ptr, 1023);
			let desc: String = CStr::from_bytes_until_nul(&buffer[..])?.to_string_lossy().into_owned();
			LoadStringA(hmodule, OBJ_CATEGORY, ptr, 1023);
			let category: String = CStr::from_bytes_until_nul(&buffer[..])?.to_string_lossy().into_owned();
			LoadStringA(hmodule, OBJ_WEB, ptr, 1023);
			let web: String = CStr::from_bytes_until_nul(&buffer[..])?.to_string_lossy().into_owned();

			Ok(PluginStringTable {
				name,
				author,
				version,
				desc,
				category,
				web,
			})
		}
	}

	pub async fn read_file_plugin_string_table(path: &Path) -> Result<PluginStringTable> {
		unsafe {
			let hmodule = blocking!(@(ref path) LoadLibraryExW(&HSTRING::from(path.as_os_str()), HANDLE::default(), LOAD_LIBRARY_AS_DATAFILE)).await??;
			async_cleanup! {
				do { blocking!(FreeLibrary(hmodule)).await?? }
				let string_table = read_plugin_string_table(hmodule)?;
				anyhow::Ok(string_table)
			}
		}
	}

	#[instrument]
	pub async fn read_dllblock_names(exe_path: &Path) -> Result<HashMap<i32, String>> {
		let datas = towermod_win32::pe_resource::read_dllblock_bins(exe_path).await?;
		let mut names = HashMap::new();
		let mut set = JoinSet::new();
		for (plugin_idx, data) in datas.into_iter() {
			set.spawn(async move {
				let temp_file = tempfile::NamedTempFile::new()?;
				fs::write(temp_file.path(), data).await?;
				let string_table = read_file_plugin_string_table(temp_file.path()).await?;
				anyhow::Ok((plugin_idx, string_table.name))
			});
		}
		while let Some(result) = set.join_next().await {
			let (i, name) = result??;
			names.insert(i, name);
		}
		Ok(names)
	}
}

#[cfg(windows)]
pub use ffi::*;
