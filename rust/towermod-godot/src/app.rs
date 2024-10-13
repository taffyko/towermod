use std::collections::HashMap;
use std::io::Cursor;
use std::io::Read;
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Mutex, Arc};
use futures::stream::StreamExt;

use anyhow::{Result, Context};
use bindings::CstcData;
use godot::prelude::*;
use godot::classes::*;
use godot::meta::ToGodot;
use godot::classes::WeakRef;
use godot::engine::global::weakref;
use fs_err::tokio as fs;
use tokio::io::AsyncWriteExt;
use tokio::sync::RwLock;
use towermod::async_cleanup;
use towermod::cstc::ImageMetadata;
use towermod::get_cache_dir_path;
use towermod::get_default_project_dir_path;
use async_scoped::TokioScope;
use towermod::get_mods_dir_path;
use towermod::get_temp_file;
use towermod::util::remove_dir_if_exists;
use towermod::ModInfo;
use towermod::ModType;
use towermod::ProjectType;
use towermod::{Game, Project, try_find_towerclimb};
use towermod::PeResource;
use tracing::instrument;
use crate::bindings::*;
use crate::util::{promise, Promise, app, status};
use super::*;
use towermod::cstc;
use towermod::util::{merge_copy_into, zip_merge_copy_into, ext::*};
use serde::{Serialize, Deserialize};
use ::time;


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppState {
	pub game: Option<Game>,
	pub project: Option<Project>,
}


#[derive(Debug, GodotClass)]
#[class(base=Object)]
pub struct Towermod {
	pub base: Base<Object>,
	pub state: Arc<RwLock<AppState>>,
	/// Loaded data for the current game
	pub game_data: Option<Gd<CstcData>>, // TODO
	/// Loaded data for the current project
	#[var] pub data: Gd<CstcData>,
}

#[godot_api]
impl Towermod {
	#[func]
	fn version() -> GString {
		return GString::from(towermod::VERSION)
	}
	
	#[func]
	fn dump_images() -> Promise<()> {
		promise! {
			let state = Towermod::state();
			let state = state.read().await;
			let game = state.game.as_ref().unwrap();
			let image_dump_dir = game.image_dump_dir().await?;
			let images = cstc::ImageBlock::read_from_pe(game.game_path()?).unwrap();
			
			unsafe {TokioScope::scope_and_collect(|s| {
				for image in &images {
					s.spawn(fs::write(
						image_dump_dir.join(format!("{}.png", image.id)),
						&image.data,
					));
				}
			})}.await;
		}
	}
	
	#[instrument]
	async fn save_state() -> Result<()> {
		let saved_state_path = towermod::get_cache_dir_path().join("towermod-gui.toml");
		let state = Towermod::state();
		let state = state.read().await;
		fs::write(saved_state_path, toml::to_string_pretty(&*state)?).await?;
		Ok(())
	}

	#[instrument]
	async fn load_state() -> Result<AppState> {
		let saved_state_path = towermod::get_cache_dir_path().join("towermod-gui.toml");
		let state: AppState = toml::from_str(&fs::read_to_string(saved_state_path).await?)?;
		Ok(state)
	}

	#[func]
	pub fn singleton() -> Gd<Self> {
		let engine = Engine::singleton();
		engine.get_singleton(StringName::from("Towermod")).unwrap().cast()
	}

	#[func]
	fn get_project() -> Option<Gd<TowermodProject>> {
		let state = Towermod::state();
		let state = state.blocking_read();
		state.project.as_ref().map(from_trait_to_gd)
	}
	
	/// True if a valid named/saved project is currently loaded
	#[func]
	fn is_project_named() -> bool {
		let state = Towermod::state();
		let state = state.blocking_read();
		state.project.is_some()
	}
	
	/// True if project data is present (may or may not be saved)
	#[func]
	fn is_project_open() -> bool {
		app!(@block this);
		let data = this.data.bind();
		data.layouts.is_empty()
	}
	
	#[func]
	fn get_default_project_dir() -> GString {
		return path_to_gd(get_default_project_dir_path())
	}

	#[func]
	fn get_game() -> Option<Gd<TowermodGame>> {
		let state = Towermod::state();
		let state = state.blocking_read();
		state.game.as_ref().map(from_trait_to_gd)
	}

	/// True if a valid game path has been set
	#[func]
	fn is_game_set() -> bool {
		let state = Towermod::state();
		let state = state.blocking_read();
		state.game.is_some()
	}
	
	#[func]
	fn get_mods_dir_path() -> GString {
		path_to_gd(get_mods_dir_path())
	}
	
	#[func]
	fn list_installed_mods() -> Promise<Array<Gd<TowermodModInfo>>> {
		promise! {
			let mut stream = fs::read_dir(get_mods_dir_path()).await?;
			let mut mods: Vec<ModInfo> = Vec::new();
			while let Some(entry) = stream.next_entry().await? {
				let meta = entry.metadata().await?;
				if meta.is_file() {
					let path = entry.path();
					let file_name = path.file_name().context("bad filename")?.to_string_lossy();
					if let Result::<_>::Err(e) = try {
						if !file_name.ends_with(".zip") { continue }
						// TODO: make async
						let file = fs_err::File::open(&path)?;
						let mut zip = zip::ZipArchive::new(file)?;
						let mut mod_info = {
							let mut mod_info: ModInfo = {
								let mut file = zip.by_name("manifest.toml")?;
								let mut s = String::new();
								file.read_to_string(&mut s)?;
								toml::from_str(&s)?
							};

							if let Ok(mut file) = zip.by_name("icon.png") {
								let mut icon = vec![];
								file.read_to_end(&mut icon)?;
								mod_info.icon = Some(icon);
							}

							if let Ok(mut file) = zip.by_name("cover.png") {
								let mut cover = vec![];
								file.read_to_end(&mut cover)?;
								mod_info.cover = Some(cover);
							}

							mod_info
						};
						mod_info.file_path = Some(path.clone());
						mods.push(mod_info);
					} {
						crate::util::show_error(e.context(format!("Error reading mod: {file_name:?}")));
						continue
					};
				}
			}
			mods.into_iter().map(|mod_info| {
				Gd::from_object(TowermodModInfo::from(&mod_info))
			}).collect::<Array<Gd<TowermodModInfo>>>()
		}
	}
	
	#[signal]
	fn rust_error(message: GString);
	#[signal]
	fn rust_confirm_warning(message: GString, confirm_text: GString, base: Gd<Object>, callback_name: GString, args: Array<Variant>);
	
	#[signal]
	fn game_path_updated(path: GString, valid: bool);
	#[signal]
	fn active_project_updated(valid: bool);
	#[signal]
	fn callback(id: i64, args: VariantArray);
	
	#[func]
	// Auto-select game based on saved config/etc.
	pub fn setup() -> Promise<()> {
		promise! {
			towermod::first_time_setup().await?;
			if let Ok(AppState { game: Some(Game { file_path: Some(path), .. }), .. }) = Towermod::load_state().await {
				Towermod::_set_game_path(path.to_string_lossy().to_string()).await;
			} else if let Ok(path) = try_find_towerclimb() {
				Towermod::_set_game_path(path.to_string_lossy().to_string()).await;
			} else {
				Towermod::emit("game_path_updated", &["".to_string().to_variant(), false.to_variant()]);
			}
		}
	}
	
	/// # Panics
	/// - Game/project not set
	#[func]
	pub fn export_mod(mod_type: TowermodModType) -> Promise<()> {
		status!("Exporting");
		let mod_type: ModType = From::from(mod_type);
		promise! {
			let state = Towermod::state();
			let (game_path, project_dir, images_path, files_path, savefiles_path);
			{
				let state = state.read().await;
				let project = state.project.as_ref().context("Project not set")?;
				game_path = state.game.as_ref().context("Game not set")?.game_path()?.clone();
				project_dir = project.dir_path()?.clone();
				images_path = project.images_path()?;
				files_path = project.files_path()?;
				savefiles_path = project.savefiles_path()?;
			}

			let mut buffer = vec![];
			let mut zip = zip::ZipWriter::new(Cursor::new(&mut buffer));
			let options: zip::write::FileOptions<'_, ()> = zip::write::FileOptions::default().compression_method(zip::CompressionMethod::Deflated);

			if mod_type == ModType::BinaryPatch {
				let mut level_block_patch = Vec::new();
				let mut app_block_patch = Vec::new();
				let mut event_block_patch = Vec::new();
				{
					let original_level_block_bin = cstc::LevelBlock::read_bin(&game_path)?;
					let original_app_block_bin = cstc::AppBlock::read_bin(&game_path)?;
					let original_event_block_bin = cstc::EventBlock::read_bin(&game_path)?;
					let (level_block, app_block, event_block, image_block) = {
						app!(this);
						let data = this.data.bind();
						data.get_data()
					};
					
					status!("Generating patches");
					let ((), results) = unsafe {TokioScope::scope_and_collect(|s| {
						s.spawn_blocking(|| {
							let level_block_bin = level_block.to_bin()?;
							level_block_patch = towermod::util::diff(&original_level_block_bin, &level_block_bin)?;
							anyhow::Ok(())
						});
						s.spawn_blocking(|| {
							let app_block_bin = app_block.to_bin()?;
							app_block_patch = towermod::util::diff(&original_app_block_bin, &app_block_bin)?;
							anyhow::Ok(())
						});
						s.spawn_blocking(|| {
							let event_block_bin = event_block.to_bin()?;
							event_block_patch = towermod::util::diff(&original_event_block_bin, &event_block_bin)?;
							anyhow::Ok(())
						});
					})}.await;
					for result in results {
						result??;
					}
				}
				{
					status!("Zipping patches");
					zip.start_file("levelblock.patch", options)?;
					zip.write_all(&level_block_patch)?;
					zip.start_file("eventblock.patch", options)?;
					zip.write_all(&event_block_patch)?;
					zip.start_file("appblock.patch", options)?;
					zip.write_all(&app_block_patch)?;
					// TODO: write imageblock.patch
				}
			}


			zip.add_file_if_exists(project_dir.join("cover.png"), options).await?;
			zip.add_file_if_exists(project_dir.join("icon.png"), options).await?;

			zip.add_dir_if_exists(&images_path, options).await?;
			zip.add_dir_if_exists(&files_path, options).await?;
			zip.add_dir_if_exists(&savefiles_path, options).await?;

			let mod_info = {
				let state = state.read().await;
				ModInfo::new(state.project.clone().context("project not set")?, mod_type)
			};
			status!("Writing zip file");
			let s = toml::to_string_pretty(&mod_info)?;
			zip.start_file("manifest.toml", options)?;
			zip.write_all(s.as_bytes())?;
			zip.finish()?;
			let mut file = fs::File::create(&mod_info.export_path()).await?;
			file.write_all(&buffer).await?;
		}
	}
	
	/// # Errors
	/// - Game path not set
	#[func]
	pub fn start_vanilla() -> Promise<()> {
		promise! {
			let state = Towermod::state();
			let state = state.read().await;
			let game = state.game.as_ref().context("game path not set")?;
			towermod::run_game(&game.game_path()?).await?;
		}
	}

	/// # Panics
	/// - Game not set
	/// - Data not set
	#[func]
	fn play_project(debug: bool) -> Promise<()> {
		let (level_block, app_block, mut event_block, image_metadata) = {
			app!(@block this);
			let data = this.data.bind();
			data.get_data()
		};
		promise! {
			let state = Towermod::state();
			let mut images_dir = None;
			{
				let state = state.read().await;
				if let Some(project) = state.project.as_ref() {
					if let Ok(path) = project.images_path() {
						images_dir = Some(path);
					}
				}
			}
			let images = CstcData::patched_imageblock(images_dir.as_ref(), Some(image_metadata)).await?;
			
			let state = state.read().await;
			let game = state.game.as_ref().unwrap();

			let game_path = game.game_path()?;
			let game_name = game_path.file_name().unwrap();
			let src_path;
			if debug {
				src_path = game.get_debug_build().await?;
				CstcData::remove_mouse_cursor_hide_events(&mut event_block);
			} else {
				src_path = game.get_release_build().await?;
			}
			
			
			let mut runtime_dir;
			let unique_name;
			if let Some(project) = &state.project {
				unique_name = project.unique_name();
				if game.game_type == towermod::GameType::Towerclimb {
					let towerclimb_savefiles_dir = PathBuf::from_iter([towermod::get_appdata_dir_path(), PathBuf::from_iter(["TowerClimb/Mods", &*unique_name])]);
					merge_copy_into(&project.savefiles_path()?, &towerclimb_savefiles_dir, false, false).await?;
				}
				runtime_dir = project.mod_runtime_dir_path();
				// Recursively copy game directory using hardlinks
				merge_copy_into(&game_path.parent().unwrap(), &runtime_dir, true, true).await?;
				// Recursively copy files from mod/project dir using hardlinks
				merge_copy_into(&project.files_path()?, &runtime_dir, true, true).await?;
			} else {
				unique_name = String::from("unnamed project");
				// for unnamed projects, delete and recreate a fresh save directory on every run
				if game.game_type == towermod::GameType::Towerclimb {
					let towerclimb_savefiles_dir = PathBuf::from_iter([towermod::get_appdata_dir_path(), PathBuf::from_iter(["TowerClimb/Mods", &*unique_name])]);
					remove_dir_if_exists(towerclimb_savefiles_dir).await?;
				}
				runtime_dir = towermod::get_cache_dir_path();
				runtime_dir.push("mods/unnamed project/runtime");
			}
			if game.game_type == towermod::GameType::Towerclimb {
				// this copies settings from the vanilla game save dir
				CstcData::rebase_towerclimb_save_path(&mut event_block, &unique_name).await?;
			}
			fs::create_dir_all(&runtime_dir).await?;

			let output_path = runtime_dir.join(game_name);
			// Delete existing executable if present
			if let Err(e) = fs::remove_file(&output_path).await {
				match e.kind() {
					std::io::ErrorKind::NotFound => (),
					_ => Err(e)?,
				}
			}
			fs::copy(&src_path, &output_path).await?;
			if debug {
				// Needed for debug builds to find on-disk runtime plugins
				fs::write(runtime_dir.join("Construct.ini"), game.construct_ini().await?).await?;
			}
			images.write_to_pe(&output_path)?;
			app_block.write_to_pe(&output_path)?;
			event_block.write_to_pe(&output_path)?;
			level_block.write_to_pe(&output_path)?;
			towermod::run_game(&output_path).await?;
		}
	}
	
	
	#[func]
	pub fn play_mod(zip_path: String) -> Promise<()> {
		promise! {
			// TODO: gamebanana url installation
			// TODO: cache once files are created for a given version of a mod
			let zip_bytes = fs::read(&zip_path).await?;
			let cursor = Cursor::new(&zip_bytes);
			let zip = std::sync::Mutex::new(zip::ZipArchive::new(cursor)?);

			let mut mod_info: ModInfo = {
				let mut zip = zip.lock().unwrap();
				let mut file = zip.by_name("manifest.toml")?;
				let mut s = String::new();
				file.read_to_string(&mut s)?;
				toml::from_str(&s)?
			};

			let state = Towermod::state();
			{
				let state = state.read().await;
				let game = state.game.as_ref().unwrap();
				if mod_info.game.data_hash != game.data_hash {
					anyhow::bail!("mod and currently selected game do not match");
				}
				mod_info.game = game.clone();
			}
			let game_path = mod_info.game.game_path()?.clone();
			let runtime_dir = mod_info.mod_runtime_dir().await?;
			

			status!("Copying base game files");
			merge_copy_into(&game_path.parent().context("game_path.parent()")?, &runtime_dir, true, true).await?;
			
			let images_by_id: Mutex<HashMap<i32, Vec<u8>>> = Mutex::new(HashMap::new());

			status!("Writing custom images and files");
			let zip_len = { let zip = zip.lock().unwrap(); zip.len() };

			let is_towerclimb = mod_info.game.game_type == towermod::GameType::Towerclimb;

			let results = std::sync::Mutex::new(vec![]);
			let stream = futures::stream::iter(0..zip_len);
			{
				stream.for_each_concurrent(None, async |i: usize| {
					let result: Result<()> = try {
						let mut zip = zip.lock().unwrap();
						let mut file = zip.by_index(i)?;
						if !file.is_file() { return }
						let filename = file.name();
						if filename.starts_with("images/") && filename.ends_with(".png") {
							let path = file.enclosed_name().with_context(|| format!("bad zip entry: {filename}"))?;
							let file_stem = path.file_stem().with_context(|| format!("bad image name: {path:?}"))?.to_string_lossy();
							if let Ok(i) = str::parse::<i32>(&file_stem) {
								let mut buf = Vec::new();
								file.read_to_end(&mut buf)?;
								let mut images_by_id = images_by_id.lock().unwrap();
								images_by_id.insert(i, buf);
							};
						}
					};
					results.lock().unwrap().push(result);
				}).await;
			}
			let results = results.into_inner().unwrap();
			for result in results {
				result?;
			}

			let mut zip = zip.into_inner().unwrap();
			zip_merge_copy_into(&mut zip, "files/", &runtime_dir, true).await?;
			if is_towerclimb {
				let towerclimb_savefiles_dir = PathBuf::from_iter([towermod::get_appdata_dir_path(), PathBuf::from_iter(["TowerClimb/Mods", &*mod_info.unique_name()])]);
				zip_merge_copy_into(&mut zip, "savefiles/", &towerclimb_savefiles_dir, true).await?;
			}
			
			let game_name = game_path.file_name().unwrap();
			let output_exe_path = runtime_dir.join(game_name);

			// Delete existing executable if present
			if let Err(e) = fs::remove_file(&output_exe_path).await {
				match e.kind() {
					std::io::ErrorKind::NotFound => (),
					_ => Err(e)?,
				}
			}

			if mod_info.mod_type == ModType::Legacy {
				status!("Reading legacy patch");
				let patch = {
					let mut file = zip.by_name("patch.json")?;
					let mut s: String = String::new();
					file.read_to_string(&mut s)?;
					let patch: towermod::tcr::TcrepainterPatch = serde_json::from_str(&s)?;
					patch
				};
				status!("Applying legacy patch to executable");
				let mut bytes = fs::read(&game_path).await?;
				// need to apply the patch first, then transplant resources to a clean runtime binary
				// otherwise the offsets would be incorrect
				patch.patch(&images_by_id.into_inner().unwrap(), std::io::Cursor::new(&mut bytes))?;
				{
					status!("Writing data");
					let temp_file = get_temp_file().await?;
					async_cleanup! {
						do { fs::remove_file(&temp_file).await? }
						fs::write(&temp_file, &bytes).await?;
						status!("Converting executable");
						towermod::convert_to_release_build(&temp_file, &output_exe_path).await?;
						anyhow::Ok(())
					}?
				};
			} else {
				let level_block_patch: Mutex<Option<Vec<u8>>> = Mutex::new(None);
				let event_block_patch: Mutex<Option<Vec<u8>>> = Mutex::new(None);
				let app_block_patch: Mutex<Option<Vec<u8>>> = Mutex::new(None);
				let image_metadata_patch: Mutex<Option<Vec<u8>>> = Mutex::new(None);

				let src_exe_path = mod_info.game.get_release_build().await?;
				fs::copy(&src_exe_path, &output_exe_path).await?;

				if mod_info.mod_type == ModType::BinaryPatch {
					status!("Extracting patches");
					{
						if let Ok(mut file) = zip.by_name("levelblock.patch") {
							let mut buf = Vec::new();
							file.read_to_end(&mut buf)?;
							*level_block_patch.lock().unwrap() = Some(buf);
						}
						if let Ok(mut file) = zip.by_name("appblock.patch") {
							let mut buf = Vec::new();
							file.read_to_end(&mut buf)?;
							*app_block_patch.lock().unwrap() = Some(buf);
						}
						if let Ok(mut file) = zip.by_name("eventblock.patch") {
							let mut buf = Vec::new();
							file.read_to_end(&mut buf)?;
							*event_block_patch.lock().unwrap() = Some(buf);
						};
						if let Ok(mut file) = zip.by_name("imageblock.patch") {
							let mut buf = Vec::new();
							file.read_to_end(&mut buf)?;
							*image_metadata_patch.lock().unwrap() = Some(buf);
						};
					}

					status!("Patching executable");
					let images_by_id = images_by_id.into_inner()?;
					if !images_by_id.is_empty() {
						// TODO: read imageblock from game, convert to image metadata only
						// apply patch
						// then convert back to imageblock and load
						let image_metadata = None;
						let patched_image_block = CstcData::patch_with_images(images_by_id, image_metadata).await?;
						patched_image_block.write_to_pe(&output_exe_path)?;
					}
					if let Some(level_block_patch) = level_block_patch.into_inner().unwrap() {
						let level_block_bin = cstc::LevelBlock::read_bin(&game_path)?;
						let buf = towermod::util::apply_patch(&*level_block_bin, &*level_block_patch)?;
						cstc::LevelBlock::write_bin(&output_exe_path, &buf)?;
					}
					if let Some(event_block_patch) = event_block_patch.into_inner().unwrap() {
						let event_block_bin = cstc::EventBlock::read_bin(&game_path)?;
						let buf = towermod::util::apply_patch(&*event_block_bin, &*event_block_patch)?;
						cstc::EventBlock::write_bin(&output_exe_path, &buf)?;
					}
					if let Some(app_block_patch) = app_block_patch.into_inner().unwrap() {
						let app_block_bin = cstc::AppBlock::read_bin(&game_path)?;
						let buf = towermod::util::apply_patch(&*app_block_bin, &*app_block_patch)?;
						cstc::AppBlock::write_bin(&output_exe_path, &buf)?;
					}
				}
			}


			if is_towerclimb {
				status!("Editing save location");
				let mut event_block = cstc::EventBlock::read_from_pe(&output_exe_path)?;
				CstcData::rebase_towerclimb_save_path(&mut event_block, &mod_info.unique_name()).await?;
				event_block.write_to_pe(&output_exe_path)?;
			}

			status!("Running executable");
			towermod::run_game(&output_exe_path).await?;
		}
	}

	pub fn state() -> Arc<RwLock<AppState>> {
		app!(@block this);
		this.state.clone()
	}
	
	pub fn emit(name: &str, varargs: &[Variant]) {
		app!(@block mut this);
		this.base_mut().emit_signal(StringName::from(name), varargs);
	}

	/// # Panics
	/// - Game not set
	#[func]
	pub fn init_data() -> Promise<()> {
		promise! {
			Towermod::emit("active_project_updated", &[false.to_variant()]);
			let (level_block, app_block, event_block) = {
				let state = Towermod::state();
				let mut state = state.write().await;
				state.project = None;
				let game = state.game.as_mut().context("game not set")?;
				let game_path = game.game_path()?;


				status!("Reading levelblock");
				let level_block = cstc::LevelBlock::read_from_pe(&game_path)?;
				status!("Reading appblock");
				let app_block = cstc::AppBlock::read_from_pe(&game_path)?;
				status!("Reading eventblock");
				let event_block = cstc::EventBlock::read_from_pe(&game_path)?;
				(level_block, app_block, event_block)
			};

			{
				app!(mut this);
				let this_data = Gd::from_init_fn(|base| {
					CstcData {
						base,
						plugin_names: Dictionary::new(),
						editor_plugins: Dictionary::new(),
						object_types: Dictionary::new(),
						layouts: Array::new(),
						behaviors: Array::new(),
						traits: Array::new(),
						families: Array::new(),
						containers: Array::new(),
						animations: Array::new(),
						images: Dictionary::new(),
						image_block: Dictionary::new(),
						app_block: None,
						event_block: None,
						animations_by_id: HashMap::new(),
						object_instances_by_id: HashMap::new(),
						object_instances_by_type: HashMap::new(),
					}
				});
				// TODO: keep this.data unset until successful completion to prevent partially-set data
				this.data = this_data.clone();
			}
			Towermod::ensure_base_data().await?;
			{
				app!(mut this);
				CstcData::set_data(&mut this.data, (&level_block, &app_block, &event_block, None));
				this.data.bind_mut().update_access_maps();
			}
			Towermod::emit("active_project_updated", &[true.to_variant()]);
		}
	}

	#[instrument]
	async fn ensure_base_data() -> Result<()> {
		let state = Towermod::state();
		let no_data = {
			let state = state.read().await;
			app!(mut this);

			let game = state.game.as_ref().unwrap();
			let weak: Gd<WeakRef> = weakref(this.data.to_variant()).to();

			// load editor_plugins, plugin_names, images, if not already present
			if this.data.bind().image_block.is_empty() {
				status!("Initializing image data");
				// TODO: rework image loading flow
				let image_resources = cstc::ImageBlock::read_from_pe(&game.game_path()?).unwrap();
				let mut images: HashMap<i32, Gd<Image>> = HashMap::new();
				let mut image_block: HashMap<i32, ImageMetadata> = HashMap::new();
				for image_resource in image_resources {
					let id = image_resource.id;
					images.insert(id, vec_to_image(&image_resource.data));
					image_block.insert(id, From::from(image_resource));
				}
				this.data.bind_mut().images = images.into_iter().collect();
				this.data.bind_mut().image_block = data_dict_to_gd::<i32, CstcImageMetadata>(&image_block, &weak);
			}
			let no_data = this.data.bind().plugin_names.is_empty();
			no_data
		};
		if no_data {
			status!("Loading Construct Classic plugin data");
			let state = state.read().await;
			let game = state.game.as_ref().unwrap();
			let (mut editor_plugins, plugin_names) = game.load_editor_plugins().await?;

			editor_plugins.insert(-1, towermod::cstc::get_system_plugin());
			let plugin_names: Dictionary = plugin_names.iter().map(|(i, s)| { (*i, GString::from(s)) }).collect();

			status!("Loading");
			app!(@block mut this);
			let weak: Gd<WeakRef> = weakref(this.data.to_variant()).to();
			this.data.bind_mut().editor_plugins = data_dict_to_gd::<i32, CstcPluginData>(&editor_plugins, &weak);
			this.data.bind_mut().plugin_names = plugin_names;
		}
		Ok(())
	}
	
	/// Returns `false` when path cannot be used
	#[func]
	pub fn set_game_path(file_path: String) -> Promise<()> {
		promise! {
			Towermod::_set_game_path(file_path).await;
		}
	}
	#[instrument]
	async fn _set_game_path(file_path: String) {
		let path = PathBuf::from(file_path.to_string());
		let state = Towermod::state();
		{
			// Discard all loaded game/project data
			let mut state = state.write().await;
			app!(mut this);
			this.game_data = None;
			this.data = Default::default();
			state.game = None;
			state.project = None;
		}
		let result = if let Ok(game) = Game::from_path(path.clone()).await {
			let mut state = state.write().await;
			state.game = Some(game);
			true
		} else {
			false
		};
		if result {
			let _ = Towermod::save_state().await;
		}
		Towermod::emit("game_path_updated", &[path_to_gd(&path).to_variant(), result.to_variant()]);
	}
	
	/// # Panics
	/// - Game not set
	#[func]
	pub fn load_project(file_path: String) -> Promise<()> {
		let manifest_path = PathBuf::from(&file_path);
		let state = Towermod::state();
		promise! {
			let proj = Project::from_path(&manifest_path).await?;
			let state = state.read().await;
			let project_matches_current_game = {
				proj.game.file_hash == state.game.as_ref().unwrap().file_hash
			};
			if project_matches_current_game {
				drop(state);
				Towermod::_load_project(file_path).await?;
			} else {
				// Warn if project and current game differ
				let message = {
					let game = state.game.as_ref().unwrap();
					indoc::formatdoc!(r#"
						Project and current game version DO NOT match.
						Combining project data with the wrong game data usually won't end well.
						Back up your project first.
					
						Expected game for project {}:
						- Filename: {}
						- Size: {} bytes
						- MD5: {}

						Current game:
						- Filename: {}
						- Size: {} bytes
						- MD5: {}
					"#, proj.name, proj.game.file_name, proj.game.file_size, proj.game.file_hash, game.file_name, game.file_size, game.file_hash)
				};
				Towermod::confirm_callback(&message, &"Force load anyway", None, "_load_project_callback", &[file_path.to_variant()]);
			}
		}
	}

	#[func]
	fn _load_project_callback(file_path: String) -> Promise<()> {
		promise! {
			Towermod::_load_project(file_path).await?;
		}
	}
	
	#[instrument]
	pub async fn _load_project(file_path: String) -> Result<()> {
		status!("Loading");
		let state = Towermod::state();
		let (proj, manifest_path);
		{
			let mut state = state.write().await;
			state.project = None;
			Towermod::emit("active_project_updated", &[false.to_variant()]);

			manifest_path = PathBuf::from(file_path.to_string());
			proj = Project::from_path(&manifest_path).await?;
			if proj.project_type != ProjectType::Towermod {
				anyhow::bail!("Project manifest of type {:?} cannot be loaded as a TowerMod project", proj.project_type);
			}
		};
		status!("Reading project data");
		let proj_dir = manifest_path.parent().unwrap();
		let level_block_json = fs::read(proj_dir.join("levelblock.json")).await?;
		let app_block_json = fs::read(proj_dir.join("appblock.json")).await?;
		let event_block_json = fs::read(proj_dir.join("eventblock.json")).await?;
		let image_block_json = fs::read(proj_dir.join("imageblock.json")).await.ok();

		{
			app!(mut this);
			let this_data = Gd::from_init_fn(|base| {
				CstcData {
					base,
					plugin_names: Dictionary::new(),
					editor_plugins: Dictionary::new(),
					object_types: Dictionary::new(),
					layouts: Array::new(),
					behaviors: Array::new(),
					traits: Array::new(),
					families: Array::new(),
					containers: Array::new(),
					animations: Array::new(),
					images: Dictionary::new(),
					image_block: Dictionary::new(),
					app_block: None,
					event_block: None,
					animations_by_id: HashMap::new(),
					object_instances_by_id: HashMap::new(),
					object_instances_by_type: HashMap::new(),
				}
			});
			this.data = this_data.clone();
		};
		Towermod::ensure_base_data().await?;

		status!("Deserializing project data");
		let level_block: cstc::LevelBlock = serde_json::from_slice(&level_block_json).unwrap();
		let app_block: cstc::AppBlock = serde_json::from_slice(&app_block_json).unwrap();
		let event_block: cstc::EventBlock = serde_json::from_slice(&event_block_json).unwrap();
		let image_block: Option<Vec<cstc::ImageMetadata>> = image_block_json.map(|o| serde_json::from_slice(&o).unwrap());
		{
			app!(mut this);
			CstcData::set_data(&mut this.data, (&level_block, &app_block, &event_block, image_block.as_ref()));
			this.data.bind_mut().update_access_maps();
		}
		{
			let mut state = state.write().await;
			state.project = Some(proj);
		}
		Towermod::emit("active_project_updated", &[true.to_variant()]);
		Ok(())
	}
		
	fn confirm_callback(message: &str, confirm_text: &str, base: Option<Variant>, callback_name: &str, args: &[Variant]) {
		app!(@block mut this);
		let base = base.unwrap_or(this.to_gd().to_variant());
		this.base_mut().emit_signal(
			StringName::from("rust_confirm_warning"),
			&[
				GString::from(message).to_variant(),
				GString::from(confirm_text).to_variant(),
				base,
				GString::from(callback_name).to_variant(),
				Array::from(args).to_variant(),
			]
		);
	}
	
	/// # Panics
	/// - Game not set
	/// - Data not set
	#[func]
	pub fn save_new_project(dir_path: String, author: String, name: String, display_name: String) -> Promise<Promise<()>> {
		let state = Towermod::state();
		promise! {
			let game = {
				let state = state.read().await;
				state.game.as_ref().unwrap().clone()
			};
			let mut project = Project::new(author, name, display_name, "0.0.1".to_string(), game);
			project.dir_path = Some(PathBuf::from(&dir_path));
			fs::create_dir_all(project.images_path()?).await?;
			fs::create_dir_all(project.files_path()?).await?;
			fs::create_dir_all(project.savefiles_path()?).await?;
			{
				let mut state = state.write().await;
				state.project = Some(project);
			};
			Towermod::save_project(dir_path)
		}
	}

	/// # Panics
	/// - Game not set
	/// - Data not set
	/// - Project not set
	#[func]
	pub fn save_project(dir_path: String) -> Promise<()> {
		let state = Towermod::state();
		promise! {
			let proj_dir;
			{
				let mut state = state.write().await;
				let game = state.game.clone().unwrap();
				let project = state.project.as_mut().unwrap();
				if dir_path.is_empty() {
					proj_dir = project.dir_path.clone().unwrap();
				} else {
					proj_dir = PathBuf::from(&dir_path.to_string());
					project.dir_path = Some(proj_dir.clone());
				}

				// Update date & version
				project.date = time::OffsetDateTime::now_utc().replace_nanosecond(0)?.replace_second(0)?;
				project.towermod_version = towermod::VERSION.to_string();
				project.game = game;
				project.save_to(&proj_dir.join("manifest.toml")).await?;
			}
			
			let (level_block, app_block, event_block, image_block) = {
				app!(this);
				let data = this.data.bind();
				data.get_data()
			};
			let level_block_json = serde_json::to_vec(&level_block)?;
			let app_block_json = serde_json::to_vec(&app_block)?;
			let event_block_json = serde_json::to_vec(&event_block)?;
			let image_block_json = serde_json::to_vec(&image_block)?;
			fs::write(proj_dir.join("imageblock.json"), &image_block_json).await?;
			fs::write(proj_dir.join("levelblock.json"), &level_block_json).await?;
			fs::write(proj_dir.join("appblock.json"), &app_block_json).await?;
			fs::write(proj_dir.join("eventblock.json"), &event_block_json).await?;

			Towermod::emit("active_project_updated", &[true.to_variant()]);
		}
	}

	#[func]
	pub fn set_project(project: Gd<TowermodProject>) {
		let state = Towermod::state();
		let mut state = state.blocking_write();
		state.project = Some(From::from(&*project.bind()));
	}
	
	
	#[func]
	fn export_from_files(project: Gd<TowermodProject>) -> Promise<()> {
		let mut project = Project::from(&*project.bind());
		promise! {
			project.date = time::OffsetDateTime::now_utc().replace_nanosecond(0)?.replace_second(0)?;
			project.save().await?;
			towermod::export_from_files(&project).await?;
			project.save().await?;
		}
	}

	#[func]
	fn export_from_legacy(file_path: String, project: Gd<TowermodProject>) -> Promise<()> {
		// take a path to a patch.zip or patch.json
		// expect "files" dir in same directory
		// treat directory of file path as a project dir (copy logo/etc. there)
		let mut project = Project::from(&*project.bind());
		promise! {
			towermod::export_from_legacy(PathBuf::from(file_path), &mut project).await?;
			project.save().await?;
		}
	}
	
	/// # Panics
	/// - Game not set
	#[func]
	fn image_dump_dir() -> Promise<GString> {
		let state = Towermod::state();
		promise! {
			let state = state.read().await;
			let game = state.game.as_ref().unwrap();
			game.image_dump_dir().await?.to_string_lossy().into_godot()
		}
	}

	#[func]
	fn cache_dir_path() -> String {
		get_cache_dir_path().to_string_lossy().into_owned()
	}
	
	/// # Panics
	/// - Game not set
	#[func]
	pub fn clear_game_cache() -> Promise<()> {
		let state = Towermod::state();
		promise! {
			let state = state.read().await;
			let game = state.game.as_ref().unwrap();
			game.clear_cache().await?;
		}
	}
	

	/// # Errors
	/// - No internet connection
	#[func]
	pub fn nuke_cache() -> Promise<()> {
		promise! {
			let path = towermod::get_cache_dir_path();
			fs::remove_dir_all(path).await?;
		}
	}
}

#[godot_api]
impl IObject for Towermod {
	fn init(base: Base<Object>) -> Self {
		Self {
			base: base,
			data: Gd::default(),
			state: Arc::new(RwLock::new(AppState { game: None, project: None, })),
			game_data: None,
		}
	}
}
