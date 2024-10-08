use std::{os::raw::c_void, mem, ffi::CStr, collections::{HashMap, HashSet}};
use derivative::Derivative;
use num_derive::FromPrimitive;
use serde::{Serialize, Deserialize};
use windows::{Win32::{Foundation::{HMODULE, FreeLibrary}, System::LibraryLoader::{LoadLibraryW, GetProcAddress}, UI::WindowsAndMessaging::LoadStringA, Graphics::Gdi::HBITMAP}, core::{PSTR, HSTRING, s}};
use anyhow::Result;

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

const ACETYPE_CONDITION: i32 = 0;
const ACETYPE_ACTION: i32 = 1;
const ACETYPE_EXPRESSION: i32 = 2;
const ACETYPE_CNDFUNC: i32 = 3;
const ACETYPE_ACTFUNC: i32 = 4;
const ACETYPE_EXPFUNC: i32 = 5;
const ACETYPE_EXPNAME: i32 = 6;

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginStringTable {
	pub name: String,
	pub author: String,
	pub version: String,
	pub desc: String,
	pub category: String,
	pub web: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct Param {
	pub param_type: u16,
	pub name: String,
	pub desc: String,
	pub init_str: String,
}

#[derive(Derivative, Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct CPropItem {
	pub prop_type: i32,
	pub label: String,
	pub description: String,
	pub text: String,
}

fn sort_categories(aces: &HashMap<i32, AcesEntry>) -> AceCategories {
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

#[cfg(target_arch = "x86")]
#[allow(non_camel_case_types)]
#[allow(non_snake_case)]
pub mod x86_plugin_ffi {
	use std::{ffi::c_char, path::Path, ptr};
	use super::*;

	unsafe fn ptr_to_string(ptr: *const c_char) -> String {
		if (ptr == ptr::null()) {
			return "".to_owned();
		}
		unsafe { CStr::from_ptr(ptr).to_string_lossy().into_owned() }
	}

	#[repr(C)]
	#[derive(Debug, Default)]
	struct Rect {
		pub left: u32,
		pub top: u32,
		pub right: u32,
		pub bottom: u32,
	}

	#[repr(C)]
	#[derive(Debug, Derivative)]
	#[derivative(Default)]
	struct Oinfo {
		pub ide_flags: i32,
		pub hinst_dll: HMODULE,
		/// Index of DLL in DLLs list
		pub o_id: u32, 
		pub e_size: u32,
		#[derivative(Default(value = "ptr::null()"))]
		pub prop_table: *const PropertyTableEntry,
		pub rect: Rect,
		#[derivative(Default(value = "ptr::null()"))]
		pub object_data_unused: *const u8,
		#[derivative(Default(value = "[0; 260]"))]
		pub ext_file_name: [u8; 260],
		#[derivative(Default(value = "[0; 256]"))]
		pub ext_name: [u8; 256],
		pub minimum_version: i32,
		pub small_icon: HBITMAP,
	}

	#[repr(C)]
	#[derive(Debug, Derivative, Clone)]
	#[derivative(Default)]
	struct PropertyTableEntry {
		pub prop_type: Property,
		pub parentId: i32,
		#[derivative(Default(value = "[0; 256]"))]
		pub szLabel: [u8; 256],
		#[derivative(Default(value = "[0; 256]"))]
		pub szInfo: [u8; 256],
		pub textLen: i32,
		#[derivative(Default(value = "[0; 256]"))]
		pub comboOptions: [u8; 256],
		pub offset: i32,
	}

	#[repr(C)]
	#[derive(Debug, Derivative)]
	#[derivative(Default)]
	struct MicroAceTool {
		#[derivative(Default(value = "&MICRO_ACE_VT"))]
		pub vtable: *const MicroAceVtable,
		ace: AcesEntry,
		cnds: Vec<Option<AcesEntry>>,
		acts: Vec<Option<AcesEntry>>,
		exps: Vec<Option<AcesEntry>>,
	}
	#[repr(C)]
	struct MicroAceVtable {
		RunAce: extern "thiscall" fn(&mut MicroAceTool, f: i32, p: *const c_char, typ: i32, flags: i32),
		Param: extern "thiscall" fn(&mut MicroAceTool, param_type: i32, name: *const c_char, desc: *const c_char, init: *const c_char),
		EditAce: extern "thiscall" fn(&mut MicroAceTool, aceName: *const c_char, aceCategory: *const c_char, aceDisplay: *const c_char, scriptName: *const c_char, flags: i16, typ: i32, index: i32, reserved: i32)
	}
	static MICRO_ACE_VT: MicroAceVtable = MicroAceVtable {
		RunAce: MicroAceTool::RunAce,
		Param: MicroAceTool::Param,
		EditAce: MicroAceTool::EditAce,
	};
	impl MicroAceTool {
		extern "thiscall" fn RunAce(&mut self, _f: i32, _p: *const c_char, _typ: i32, _flags: i32) {}
		extern "thiscall" fn Param(&mut self, param_type: i32, name: *const c_char, desc: *const c_char, init: *const c_char) {
			unsafe {
				let p = Param {
					param_type: param_type as u16,
					name: ptr_to_string(name),
					desc: ptr_to_string(desc),
					init_str: ptr_to_string(init),
				};
				self.ace.params.push(p);
			}
		}
		extern "thiscall" fn EditAce(&mut self, aceName: *const c_char, aceCategory: *const c_char, aceDisplay: *const c_char, scriptName: *const c_char, flags: i16, typ: i32, index: i32, _reserved: i32) {
			unsafe {
				let ace = &mut self.ace;
				ace.ace_list_name = ptr_to_string(aceName);
				ace.ace_category = ptr_to_string(aceCategory);
				ace.ace_display_text = ptr_to_string(aceDisplay);
				ace.script_name = ptr_to_string(scriptName);
				ace.retrn = flags;

				let vec = match typ {
					ACETYPE_CONDITION => &mut self.cnds,
					ACETYPE_ACTION => &mut self.acts,
					ACETYPE_EXPRESSION => &mut self.exps,
					_ => panic!(),
				};

				if vec.len() == 0 {
					vec.resize(255, None);
				}

				if index < 0 || index >= vec.len() as i32 {
					vec.push(Some(ace.clone()));
				} else {
					vec[index as usize] = Some(ace.clone());
				}

				ace.params.truncate(0);
			}
		}
	}

	#[repr(C)]
	#[derive(Debug, Derivative)]
	#[derivative(Default)]
	struct MicroPropertyVector {
		#[derivative(Default(value = "&MICRO_PROPERTY_VT"))]
		vtable: *const MicroPropertyVtable,
		properties: Vec<CPropItem>,
	}
	#[repr(C)]
	struct MicroPropertyVtable {
		Proc: extern "thiscall" fn(&mut MicroPropertyVector, &CVirtualPropItem),
		Assign: extern "thiscall" fn(&mut MicroPropertyVector, *mut *const c_char, *const c_char),
	}
	static MICRO_PROPERTY_VT: MicroPropertyVtable = MicroPropertyVtable {
		Proc: MicroPropertyVector::Proc,
		Assign: MicroPropertyVector::Assign,
	};
	impl MicroPropertyVector {
		extern "thiscall" fn Proc(&mut self, x: &CVirtualPropItem) {
			unsafe {
				let item = CPropItem {
					prop_type: x.prop_type,
					label: ptr_to_string(*x.label),
					description: ptr_to_string(*x.description),
					text: ptr_to_string(*x.text),
				};
				self.properties.push(item);
			}
		}
		/// `s` contains the dereferenced *value* of a property (`label`, `description`, `text`) on the `CVirtualPropItem` given to `ETOnPropertyChanged`
		extern "thiscall" fn Assign(&mut self, s: *mut *const c_char, p: *const c_char) {
			unsafe { 
				*s = p;
			}
		}
	}

	#[repr(C)]
	#[derive(Debug, Derivative)]
	#[derivative(Default)]
	struct CVirtualPropItem {
		prop_type: i32,
		#[derivative(Default(value = "Box::new(ptr::null())"))]
		label: Box<*const c_char>,
		#[derivative(Default(value = "Box::new(ptr::null())"))]
		description: Box<*const c_char>,
		#[derivative(Default(value = "Box::new(ptr::null())"))]
		text: Box<*const c_char>,
	}

	fn to_hash_map(vec: Vec<Option<AcesEntry>>) -> HashMap<i32, AcesEntry> {
		vec.into_iter().enumerate().filter_map(|(i, v)| {
			if let Some(v) = v {
				Some((i as i32, v))
			} else {
				None
			}
		}).collect()
	}

	pub fn read_editor_plugin(path: impl AsRef<Path>) -> Result<PluginData> {
		unsafe {
			let path = path.as_ref();
			let hmodule = LoadLibraryW(&HSTRING::from(path))?;

			// Populate MicroAceTool with ETDllLoad()
			let mut mat = MicroAceTool::default();
			let ETDllLoad: extern "system" fn(*mut MicroAceTool) = mem::transmute(GetProcAddress(hmodule, s!("ETDllLoad")).unwrap());
			ETDllLoad(&mut mat);

			// Populate OINFO
			let mut oinfo = Oinfo::default();
			oinfo.hinst_dll = hmodule;
			for (i, byte) in path.to_string_lossy().as_bytes().iter().enumerate() { oinfo.ext_file_name[i] = *byte; }
			LoadStringA(oinfo.hinst_dll, 1, PSTR(&mut oinfo.ext_name as *mut u8), 256);
			oinfo.ide_flags = 0;
			oinfo.minimum_version = 1;
			let GetInfo: extern "system" fn(*mut Oinfo) = mem::transmute(GetProcAddress(hmodule, s!("GetInfo")).unwrap());
			GetInfo(&mut oinfo);

			// ETOnPropertyChanged() dumps all properties of the plugin object type when called with 0,
			// using the provided CVirtualPropItem as a scratch struct and calling virtual methods of the provided `MicroPropertyVector`
			let ETOnPropertyChanged: extern "system" fn(*const c_void, *const c_void, i32, *mut CVirtualPropItem, *const c_void, *mut MicroPropertyVector) = mem::transmute(GetProcAddress(hmodule, s!("ETOnPropertyChanged")).unwrap());
			let mut vitem = CVirtualPropItem::default();
			let mut mpvt = MicroPropertyVector::default();
			ETOnPropertyChanged(ptr::null(), ptr::null(), 0, &mut vitem, ptr::null(), &mut mpvt);
			let properties = mpvt.properties;

			// Texts
			let string_table = read_plugin_string_table(hmodule)?;

			// Icons
			// let hLargeIcon = LoadBitmapW(oinfo.hinst_dll, PCWSTR(OBJ_ICON as *const _));
			// let hSmallIcon = LoadBitmapW(oinfo.hinst_dll, PCWSTR(OBJ_SICON as *const _));

			FreeLibrary(hmodule)?;

			let cnds = to_hash_map(mat.cnds);
			let acts = to_hash_map(mat.acts);
			let exps = to_hash_map(mat.exps);

			Ok(PluginData {
				cnd_categories: sort_categories(&cnds),
				act_categories: sort_categories(&acts),
				exp_categories: sort_categories(&exps),
				conditions: cnds,
				actions: acts,
				expressions: exps,
				properties,
				string_table,
			}) 
		}
	}
}
