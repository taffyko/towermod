use core::slice;

use std::cell::RefCell;
use std::collections::HashMap;
use std::ffi::c_void;
use std::fmt::Debug;
use std::io::{Cursor, Read, Write};
use crate::{get_temp_file, ZipWriterExt};

use async_scoped::TokioScope;
use ::time::OffsetDateTime;
use tokio_stream::StreamExt;
use zip;
use std::path::{Path, PathBuf};
use log::warn;
use tokio::io::{AsyncSeekExt, AsyncWriteExt};
use tokio::task::JoinSet;
use tokio::process::Command;
use fs_err::tokio as fs;
use tracing::{instrument, Instrument, info_span};
use windows::Win32::Storage::FileSystem::{GetFileVersionInfoSizeW, GetFileVersionInfoW, VerQueryValueW};
use windows::Win32::System::LibraryLoader::{BeginUpdateResourceW, EndUpdateResourceW, EnumResourceNamesW, EnumResourceTypesExW, FindResourceExW, LoadLibraryExW, LoadResource, LockResource, SizeofResource, UpdateResourceW, LOAD_LIBRARY_AS_DATAFILE};
use anyhow::{bail, Context, Result};
use windows::Win32::Foundation::{HANDLE, HMODULE, BOOL, CloseHandle, FreeLibrary};
use windows::core::{PCWSTR, HSTRING};
use crate::cstc::plugin::{PluginData, PluginStringTable};
use crate::cstc::{self, plugin};
use crate::{Game, ModInfo, ModType, Project};
use crate::macros::*;

use super::{cstc_binary_dir, get_dllreader_path};

pub struct OpenedHandle(pub HANDLE);

impl Drop for OpenedHandle {
	fn drop(&mut self) {
		unsafe {
			if let Err(e) = CloseHandle(self.0) { log::error!("{}", e) }
		}
	}
}

unsafe fn read_hmodule_resource(hmodule: HMODULE, res_type: &ResId, res_name: &ResId) -> Result<Vec<u8>> {
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
unsafe fn list_hmodule_resource_names(hmodule: HMODULE, res_type: &ResId) -> Result<Vec<ResId>> {
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
const LANGID_DEFAULT: u16 = 1033;
#[allow(unused)]
const LANGID_ENGLISH_UK: u16 = 2057;
const RES_TYPE_STRING_TABLE: u16 = 6;

thread_local!(static RESOURCE_TYPES_ACC: RefCell<Vec<ResId>> = RefCell::new(vec![]));
unsafe fn list_hmodule_resource_types(hmodule: HMODULE) -> Result<Vec<ResId>> {
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
async fn read_dllblock_bins<T: AsRef<Path> + Debug>(exe_path: T) -> Result<HashMap<i32, Vec<u8>>> {
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
				// set.spawn_blocking(move || anyhow::Ok((res_name, read_hmodule_resource(hmodule, &res_type, res_name)?)));
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

#[instrument]
pub async fn read_dllblock_names(exe_path: &Path) -> Result<HashMap<i32, String>> {
	let datas = read_dllblock_bins(exe_path).await?;
	let mut names = HashMap::new();
	let mut set = JoinSet::new();
	for (plugin_idx, data) in datas.into_iter() {
		set.spawn(async move {
			let temp_file = get_temp_file().await?;
			async_cleanup! {
				do { fs::remove_file(&temp_file).await? }
				fs::write(&temp_file, data).await?;
				let temp_file = temp_file.clone();
				let string_table = read_file_plugin_string_table(temp_file.as_path()).await?;
				anyhow::Ok((plugin_idx, string_table.name))
			}
		});
	}
	while let Some(result) = set.join_next().await {
		let (i, name) = result??;
		names.insert(i, name);
	}
	Ok(names)
}

pub async fn read_file_plugin_string_table(path: &Path) -> Result<PluginStringTable> {
	unsafe {
		let hmodule = blocking!(@(ref path) LoadLibraryExW(&HSTRING::from(path.as_os_str()), HANDLE::default(), LOAD_LIBRARY_AS_DATAFILE)).await??;
		async_cleanup! {
			do { blocking!(FreeLibrary(hmodule)).await?? }
			let string_table = plugin::read_plugin_string_table(hmodule)?;
			anyhow::Ok(string_table)
		}
	}
}

pub trait PeResource: Sized + Send {
	fn read_bin(pe_path: impl AsRef<Path>) -> Result<Vec<u8>, anyhow::Error>;
	fn write_bin(pe_path: impl AsRef<Path>, bin: &[u8]) -> Result<(), anyhow::Error>;
	fn to_bin(&self) -> Result<Vec<u8>, anyhow::Error>;
	fn from_bin(bin: &[u8]) -> Result<Self, anyhow::Error>;
	#[allow(async_fn_in_trait)]
	#[instrument]
	async fn read_from_pe(pe_path: impl AsRef<Path> + Send + std::fmt::Debug) -> Result<Self, anyhow::Error>
		where Self: 'static
	{
		let (mut scope, ()) = unsafe {TokioScope::scope(|scope| {
			scope.spawn_blocking(|| {
				let bin = Self::read_bin(pe_path)?;
				let data = Self::from_bin(&bin)?;
				anyhow::Ok(data)
			})
		})};
		while let Some(data) = scope.next().await {
			let data = data?;
			return data
		}
		panic!()
	}
	// FIXME: make async
	fn write_to_pe(&self, pe_path: impl AsRef<Path>) -> Result<(), anyhow::Error> {
		let bin = self.to_bin()?;
		Self::write_bin(pe_path, &bin)
	}
}

impl PeResource for cstc::stable::AppBlock {
	fn read_bin(pe_path: impl AsRef<Path>) -> Result<Vec<u8>> {
		read_pe_file_resource(pe_path.as_ref(), &ResId::from("APPBLOCK"), &ResId::from(997))
	}
	fn write_bin(pe_path: impl AsRef<Path>, bin: &[u8]) -> Result<()> {
		replace_pe_file_resource(pe_path.as_ref(), &ResId::from("APPBLOCK"), &ResId::from(997), &bin)
	}
	fn to_bin(&self) -> Result<Vec<u8>> {
		cstc::serialize_appblock(self)
	}
	fn from_bin(bin: &[u8]) -> Result<Self> {
		cstc::deserialize_appblock(bin)
	}
}

impl PeResource for cstc::stable::LevelBlock {
	fn read_bin(pe_path: impl AsRef<Path>) -> Result<Vec<u8>> {
		read_pe_file_resource(pe_path.as_ref(), &ResId::from("LEVELBLOCK"), &ResId::from(998))
	}
	fn write_bin(pe_path: impl AsRef<Path>, bin: &[u8]) -> Result<()> {
		replace_pe_file_resource(pe_path.as_ref(), &ResId::from("LEVELBLOCK"), &ResId::from(998), &bin)
	}
	fn to_bin(&self) -> Result<Vec<u8>> {
		cstc::serialize_levelblock(self)
	}
	fn from_bin(bin: &[u8]) -> Result<Self> {
		cstc::deserialize_levelblock(bin)
	}
}

impl PeResource for cstc::stable::EventBlock {
	fn read_bin(pe_path: impl AsRef<Path>) -> Result<Vec<u8>> {
		read_pe_file_resource(pe_path.as_ref(), &ResId::from("EVENTBLOCK"), &ResId::from(999))
	}
	fn write_bin(pe_path: impl AsRef<Path>, bin: &[u8]) -> Result<()> {
		replace_pe_file_resource(pe_path.as_ref(), &ResId::from("EVENTBLOCK"), &ResId::from(999), &bin)
	}
	fn to_bin(&self) -> Result<Vec<u8>> {
		cstc::serialize_eventblock(self)
	}
	fn from_bin(bin: &[u8]) -> Result<Self> {
		cstc::deserialize_eventblock(bin)
	}
}

impl PeResource for cstc::stable::ImageBlock {
	fn read_bin(pe_path: impl AsRef<Path>) -> Result<Vec<u8>> {
		read_pe_file_resource(pe_path.as_ref(), &ResId::from("IMAGEBLOCK"), &ResId::from(995))
	}
	fn write_bin(pe_path: impl AsRef<Path>, bin: &[u8]) -> Result<()> {
		replace_pe_file_resource(pe_path.as_ref(), &ResId::from("IMAGEBLOCK"), &ResId::from(995), &bin)
	}
	fn to_bin(&self) -> Result<Vec<u8>> {
		cstc::serialize_imageblock(self)
	}
	fn from_bin(bin: &[u8]) -> Result<Self> {
		cstc::deserialize_imageblock(bin)
	}
}

pub async fn get_editor_plugins_path() -> Result<PathBuf> {
	Ok(cstc_binary_dir().await?.join("Plugins"))
}

pub async fn get_runtime_plugins_path() -> Result<PathBuf> {
	Ok(cstc_binary_dir().await?.join("Plugins/Runtime"))
}

#[instrument]
pub async fn remote_read_editor_plugin<T: AsRef<Path> + Debug>(path: T) -> Result<PluginData> {
	let path = path.as_ref().to_owned();
	let output = Command::new(get_dllreader_path())
		.arg("editorplugin")
		.arg(path)
		.output().await?;
	if (!output.status.success()) {
		bail!("dllreader failed: {}", String::from_utf8_lossy(&output.stderr));
	}
	Ok(rmp_serde::from_slice(&output.stdout)?)
}

#[instrument]
pub async fn export_from_legacy(file_path: PathBuf, project: &mut Project) -> Result<()> {
	let mut buffer = vec![];
	let mut out_zip = zip::ZipWriter::new(Cursor::new(&mut buffer));
	let options: zip::write::FileOptions<'_, ()> = zip::write::FileOptions::default().compression_method(zip::CompressionMethod::Deflated);
	let file_name = file_path.file_name().context("bad file path")?.to_string_lossy();
	let dir_path;
	if file_name.ends_with(".zip") {
		dir_path = file_path.parent().context("bad file path")?;
		let data = fs::read(&file_path).await?;
		let mut zip = zip::ZipArchive::new(Cursor::new(data))?;
		for i in 0..zip.len() {
			let mut file = zip.by_index(i)?;
			if file.is_file() {
				let inner_path = file.enclosed_name().context("bad zip entry name")?;
				let file_name = inner_path.file_name().context("bad zip entry name")?.to_string_lossy();
				if file_name.ends_with(".png") {
					// Add images from zip
					let mut buf = Vec::with_capacity(file.size() as usize);
					file.read_to_end(&mut buf)?;
					out_zip.start_file(format!("images/{}", file_name), options)?;
					out_zip.write_all(&buf)?;
				} else if file_name == "patch.json" {
					// Add patch.json from zip
					let mut buf = Vec::with_capacity(file.size() as usize);
					if let Some(t) = file.last_modified() {
						if let Ok(t) = OffsetDateTime::try_from(t) {
							project.date = t;
						}
					};
					file.read_to_end(&mut buf)?;
					out_zip.start_file("patch.json", options)?;
					out_zip.write_all(&buf)?;
				}
			}
		}
	} else if file_name.ends_with(".json") {
		let patch_dir = file_path.parent().context("bad file path")?;
		dir_path = patch_dir.parent().context("bad file path")?;
		// Add patch.json
		let meta = fs::metadata(&file_path).await?;
		let buf = fs::read(&file_path).await?;
		out_zip.start_file("patch.json", options)?;
		out_zip.write_all(&buf)?;
		if let Ok(t) = meta.modified() {
			project.date = OffsetDateTime::from(t).into();
		};
		// Add images from patch dir
		let mut stream = fs::read_dir(&patch_dir).await?;
		while let Some(entry) = stream.next_entry().await? {
			let entry_path = entry.path();
			let file_name = entry.file_name();
			let file_name = file_name.to_string_lossy();
			if file_name.ends_with(".png") {
				let buf = fs::read(&entry_path).await?;
				out_zip.start_file(format!("images/{}", file_name), options)?;
				out_zip.write_all(&buf)?;
			}
		}
	} else {
		anyhow::bail!("no .zip or .json provided");
	}
	out_zip.add_file_if_exists(dir_path.join("cover.png"), options).await?;
	out_zip.add_file_if_exists(dir_path.join("icon.png"), options).await?;
	out_zip.add_dir_if_exists(dir_path.join("files"), options).await?;
	out_zip.add_dir_if_exists(dir_path.join("savefiles"), options).await?;

	let mod_info = ModInfo::new(project.clone(), ModType::Legacy);
	let s = toml::to_string_pretty(&mod_info)?;
	out_zip.start_file("manifest.toml", options)?;
	out_zip.write_all(s.as_bytes())?;

	out_zip.finish()?;
	let mut file = fs::File::create(&mod_info.export_path()).await?;
	file.write_all(&buffer).await?;
	Ok(())
}

/// # Errors
/// - Project dir not set
pub async fn export_from_files(project: &Project) -> Result<()> {
	let mut buffer = vec![];
	let mut out_zip = zip::ZipWriter::new(Cursor::new(&mut buffer));
	let options: zip::write::FileOptions<'_, ()> = zip::write::FileOptions::default().compression_method(zip::CompressionMethod::Deflated);

	let dir_path = project.dir_path.as_ref().context("dir path not set")?;
	out_zip.add_file_if_exists(dir_path.join("cover.png"), options).await?;
	out_zip.add_file_if_exists(dir_path.join("icon.png"), options).await?;
	out_zip.add_dir_if_exists(dir_path.join("files"), options).await?;
	out_zip.add_dir_if_exists(dir_path.join("savefiles"), options).await?;
	out_zip.add_dir_if_exists(dir_path.join("images"), options).await?;

	let mod_info = ModInfo::new(project.clone(), ModType::FilesOnly);
	let s = toml::to_string_pretty(&mod_info)?;
	out_zip.start_file("manifest.toml", options)?;
	out_zip.write_all(s.as_bytes())?;

	out_zip.finish()?;
	let mut file = fs::File::create(&mod_info.export_path()).await?;
	file.write_all(&buffer).await?;
	Ok(())
}

#[instrument]
pub async fn load_editor_plugins_by_name(names: &HashMap<i32, String>) -> Result<HashMap<i32, PluginData>> {
	let index_by_name: HashMap<&str, i32> = names.iter()
		.map(|(i, v)| (v as &str, *i)).collect();
	let mut data_by_index: HashMap<i32, PluginData> = HashMap::new();

	let mut set = JoinSet::new();
	async {
		let mut files = fs::read_dir(get_editor_plugins_path().await?).await?;
		while let Some(entry) = files.next_entry().await? {
			set.spawn(async move {
				let meta = entry.metadata().await?;
				if !meta.is_file() {
					return anyhow::Ok(None);
				}
				let path = entry.path();
				log::debug!("Reading data for editor plugin: {:?}", path);
				let data = remote_read_editor_plugin(&path).await?;
				log::debug!("Finished reading editor plugin {}", data.string_table.name);
				anyhow::Ok(Some(data))
			});
		}
		anyhow::Ok(())
	}.instrument(info_span!("read_dir")).await?;
	while let Some(data) = set.join_next().await {
		if let Some(data) = data?? {
			if let Some(i) = index_by_name.get(&*data.string_table.name) {
				data_by_index.insert(*i as i32, data);
			}
		}
	}

	for (i, name) in names.iter() {
		if (!data_by_index.contains_key(&(*i as i32))) {
			warn!("No editor build found for plugin {}: '{}'", i, name);
		}
	}
	Ok(data_by_index)
}


/// Infer the original filename of a plugin
/// TODO: 'OriginalFilename' is not always reliable
pub fn get_original_filename(path: &Path) -> Result<String> {
	let path_hstring = HSTRING::from(path.as_os_str());
	unsafe {
		let hmodule = LoadLibraryExW(&path_hstring, HANDLE::default(), LOAD_LIBRARY_AS_DATAFILE)?;
		scopeguard::defer! { if let Err(e) = FreeLibrary(hmodule) { log::error!("{}", e) }; }
		let size = GetFileVersionInfoSizeW(&path_hstring, None);
		let mut buffer: Vec<u8> = Vec::with_capacity(size as usize);

		let buffer_ptr = buffer.as_mut_slice().as_mut_ptr() as *mut _ as *mut c_void;
		GetFileVersionInfoW(&path_hstring, 0, size, buffer_ptr)?;

		let mut char_count: u32 = 0;
		let mut p_info_buffer = 0 as *mut c_void;
		VerQueryValueW(buffer_ptr, &HSTRING::from(r"\StringFileInfo\040904b0\OriginalFilename"), &mut p_info_buffer, &mut char_count);
		let chars = slice::from_raw_parts(p_info_buffer as *const u16, char_count as usize);
		let str = String::from_utf16_lossy(chars);
		Ok(str)
	}
}

/// # Errors
/// Game path not set
pub async fn convert_to_release_build(src_exe: &Path, dest_exe: &Path) -> Result<()> {
	let base_runtime_executable = cstc_binary_dir().await?.join("Data/DX9.exe");
	fs::copy(&base_runtime_executable, dest_exe).await?;

	let src_exe = HSTRING::from(src_exe.as_os_str());
	unsafe {
		{
			let hmodule = LoadLibraryExW(&src_exe, HANDLE::default(), LOAD_LIBRARY_AS_DATAFILE)?;
			scopeguard::defer! { if let Err(e) = FreeLibrary(hmodule) { log::error!("{}", e) }; }

			let res_types = list_hmodule_resource_types(hmodule)?;
			for res_type in &res_types {
				let res_names = list_hmodule_resource_names(hmodule, &res_type)?;
				// Copy over all resources
				for res_name in &res_names {
					let bin = read_hmodule_resource(hmodule, res_type, res_name)?;
					replace_pe_file_resource(&dest_exe, res_type, res_name, &bin)?;
				}
			}

			FreeLibrary(hmodule)?;
		}
	}
	Ok(())
}


/// Transplant resources on to a debug build of the Construct Classic runtime
/// # Errors
/// Game path not set
pub async fn convert_to_debug_build(game: &Game, dest_exe: &Path) -> Result<()> {
	let src_exe = game.game_path()?;

	// Dump runtime plugins to a temporary directory
	let plugin_dump_dir = game.plugin_dump_dir().await?;
	let base_runtime_executable = cstc_binary_dir().await?.join("Data/DX9_pd.exe");

	// Copy the debug runtime base executable
	fs::copy(&base_runtime_executable, dest_exe).await?;

	// Patch the annoying "first-time warning" popup out of the executable
	{
		let mut file = fs::OpenOptions::new().write(true).open(dest_exe).await?;
		file.seek(tokio::io::SeekFrom::Start(0x54a6a)).await?;
		file.write_all(&[0xeb, 0x0e]).await?;
	}

	let src_exe = HSTRING::from(src_exe.as_os_str());
	unsafe {
		let mut string_table_entries: Vec<Vec<u8>> = Vec::new();
		{
			let hmodule = LoadLibraryExW(&src_exe, HANDLE::default(), LOAD_LIBRARY_AS_DATAFILE)?;
			scopeguard::defer! { if let Err(e) = FreeLibrary(hmodule) { log::error!("{}", e) }; }

			let res_types = list_hmodule_resource_types(hmodule)?;
			for res_type in &res_types {
				let res_names = list_hmodule_resource_names(hmodule, &res_type)?;
				match &res_type {
					// Preview builds don't embed the plugin DLLs directly,
					// they just contain the filenames, and locate and load the plugins from disk
					// based on the location set in a Construct.ini file in the same directory as the executable.
					ResId::String(ty) if ty == "DLLBLOCK" => {
						for i in 0..res_names.len() {
							// Dump each plugin to disk
							let res_name = &res_names[i];
							let bin = read_hmodule_resource(hmodule, &res_type, res_name)?;
							let file_name = format!("plugin{i}.csx");
							fs::write(plugin_dump_dir.join(&file_name), &bin).await?;

							// And add an entry to the StringTable on the destination executable
							let mut data: Vec<u8> = Vec::from([0x00, 0x00]);
							let utf16_units: Vec<u16> = file_name.encode_utf16().collect();
							data.extend((utf16_units.len() as u16).to_le_bytes());
							for char in utf16_units {
								data.extend(char.to_le_bytes());
							}
							string_table_entries.push(data);
						}
					}
					_ => {
						// Copy over all other resources
						for res_name in &res_names {
							let bin = read_hmodule_resource(hmodule, res_type, res_name)?;

							while let Err(_) = replace_pe_file_resource(&dest_exe, res_type, res_name, &bin) {
								println!("retry");
							};
						}
					}
				}
			}

			FreeLibrary(hmodule)?;
		}

		// Add the string table entries for preview-mode plugin loading
		let res_type_string_table = ResId::from(RES_TYPE_STRING_TABLE);
		for (i, data) in string_table_entries.iter().enumerate() {
			while let Err(_) = replace_pe_file_resource(&dest_exe, &res_type_string_table, &ResId::from(1000 + i as u16), data) {
				println!("retry");
			};
		}
	}
	Ok(())
}

#[instrument]
pub async fn run_game(game_path: &Path) -> Result<u32> {
	log::info!("Starting game... {}", &game_path.to_string_lossy());
	let child = Command::new(game_path)
		.spawn()
		.context("Failed to start game")?;
	child.id().context("Failed to start game")
}
