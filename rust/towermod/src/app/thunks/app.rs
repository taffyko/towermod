use std::{collections::HashMap, io::{Cursor, Read}, path::{Path, PathBuf}, sync::Mutex};
use crate::{app::state::{AppAction, ConfigAction, DataAction, TowermodConfig, STORE}, async_cleanup, convert_to_release_build, cstc::{self, plugin::PluginData, *}, first_time_setup, get_appdata_dir_path, get_mods_dir_path, get_temp_file, log_error, zip_merge_copy_into, Game, GameType, ModInfo, ModType, Nt, PeResource, Project, ProjectType, TcrepainterPatch};
use anyhow::Result;
use async_scoped::TokioScope;
use tauri::command;
use anyhow::{Context};
use fs_err::tokio as fs;
use futures::StreamExt;
use tokio::sync::RwLock;
use tracing::instrument;
use crate::app::{state::{select, CstcData}, selectors, thunks};

fn status(_msg: &str) {
	// TODO
}

static INITIALIZED: std::sync::Mutex<bool> = std::sync::Mutex::new(false);

/// Should be idempotent
#[command]
pub async fn init() -> Result<()> {
	if (!*INITIALIZED.lock().unwrap()) {
		// Set up logging / tracing
		use tracing_subscriber::prelude::*;
		use tracing::level_filters::LevelFilter;
		use tracing_subscriber::fmt::format::FmtSpan;

		let fmt_layer = tracing_subscriber::fmt::Layer::default()
			.with_span_events(FmtSpan::NEW | FmtSpan::CLOSE)
			.with_filter(LevelFilter::INFO);
		let console_layer = console_subscriber::spawn();
		let subscriber = tracing_subscriber::Registry::default()
			.with(fmt_layer)
			.with(console_layer);
		tracing::subscriber::set_global_default(subscriber).unwrap();

		let mut initialized = INITIALIZED.lock().unwrap();
		*initialized = true;
	}

	// Set up file structure
	first_time_setup().await?;

	// Skip if game already set
	if selectors::get_game().await.is_some() {
		return Ok(())
	}

	// Attempt to load existing config from disk.
	let _ = log_error(thunks::load_config().await, "");

	// Attempt to load from saved game path, if set
	let config = selectors::get_config().await;
	let mut game_path_valid = false;
	if let Some(game_path) = config.game_path {
		if let Ok(_) = log_error(thunks::set_game(Some(game_path)).await, "Failed to load game at saved path") {
			game_path_valid = true;
		}
	}
	// Otherwise, try to autodetect and load game path
	if !game_path_valid {
		if let Ok(game_path) = log_error(crate::try_find_towerclimb(), "Failed to find TowerClimb executable") {
			let _ = log_error(thunks::set_game(Some(game_path.clone())).await, "Failed to load game at detected path");
		}
	}

	Ok(())
}

#[command]
pub async fn get_installed_mods() -> Result<Vec<ModInfo>> {
	let mut stream = fs::read_dir(get_mods_dir_path()).await?;
	let mut mods: Vec<ModInfo> = Vec::new();
	while let Some(entry) = stream.next_entry().await? {
		let meta = entry.metadata().await?;
		if meta.is_file() {
			let path = entry.path();
			let file_name = path.file_name().context("bad filename")?.to_string_lossy();
			let mut mod_info = ModInfo::default();
			let result: Result<_> = try {
				if !file_name.ends_with(".zip") { continue }
				// TODO: make async
				let file = fs_err::File::open(&path)?;
				let mut zip = zip::ZipArchive::new(file)?;
				mod_info = {
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
				};
			};
			mod_info.file_path = Some(path);
			if let Err(e) = result {
				mod_info.error = Some(format!("{e}"));
			};
			mods.push(mod_info);
		}
	}
	Ok(mods)
}

#[command]
pub async fn play_mod(zip_path: PathBuf) -> Result<()> {
	let game = selectors::get_game().await.context("No game set")?;
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

	if mod_info.game.data_hash != game.data_hash {
		anyhow::bail!("mod and currently selected game do not match");
	}
	mod_info.game = game.clone();
	let game_path = mod_info.game.game_path()?.clone();
	let runtime_dir = mod_info.mod_runtime_dir().await?;

	status("Copying base game files");
	crate::merge_copy_into(&game_path.parent().context("game_path.parent()")?, &runtime_dir, true, true).await?;

	let images_by_id: Mutex<HashMap<i32, Vec<u8>>> = Mutex::new(HashMap::new());

	status("Writing custom images and files");
	let zip_len = { let zip = zip.lock().unwrap(); zip.len() };

	let is_towerclimb = mod_info.game.game_type == GameType::Towerclimb;

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
		let towerclimb_savefiles_dir = PathBuf::from_iter([get_appdata_dir_path(), PathBuf::from_iter(["TowerClimb/Mods", &*mod_info.unique_name()])]);
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
		status("Reading legacy patch");
		let patch = {
			let mut file = zip.by_name("patch.json")?;
			let mut s: String = String::new();
			file.read_to_string(&mut s)?;
			let patch: TcrepainterPatch = serde_json::from_str(&s)?;
			patch
		};
		status("Applying legacy patch to executable");
		let mut bytes = fs::read(&game_path).await?;
		// need to apply the patch first, then transplant resources to a clean runtime binary
		// otherwise the offsets would be incorrect
		patch.patch(&images_by_id.into_inner().unwrap(), std::io::Cursor::new(&mut bytes))?;
		{
			status("Writing data");
			let temp_file = get_temp_file().await?;
			async_cleanup! {
				do { fs::remove_file(&temp_file).await? }
				fs::write(&temp_file, &bytes).await?;
				status("Converting executable");
				convert_to_release_build(&temp_file, &output_exe_path).await?;
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
			status("Extracting patches");
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

			status("Patching executable");
			let images_by_id = images_by_id.into_inner()?;
			if !images_by_id.is_empty() {
				// TODO: read imageblock from game, convert to image metadata only
				// apply patch
				// then convert back to imageblock and load
				let image_metadata = None;
				let patched_image_block = patch_with_images(game.game_path()?, images_by_id, image_metadata).await?;
				patched_image_block.write_to_pe(&output_exe_path)?;
			}
			if let Some(level_block_patch) = level_block_patch.into_inner().unwrap() {
				let level_block_bin = cstc::LevelBlock::read_bin(&game_path)?;
				let buf = crate::apply_patch(&*level_block_bin, &*level_block_patch)?;
				cstc::LevelBlock::write_bin(&output_exe_path, &buf)?;
			}
			if let Some(event_block_patch) = event_block_patch.into_inner().unwrap() {
				let event_block_bin = cstc::EventBlock::read_bin(&game_path)?;
				let buf = crate::apply_patch(&*event_block_bin, &*event_block_patch)?;
				cstc::EventBlock::write_bin(&output_exe_path, &buf)?;
			}
			if let Some(app_block_patch) = app_block_patch.into_inner().unwrap() {
				let app_block_bin = cstc::AppBlock::read_bin(&game_path)?;
				let buf = crate::apply_patch(&*app_block_bin, &*app_block_patch)?;
				cstc::AppBlock::write_bin(&output_exe_path, &buf)?;
			}
		}
	}


	if is_towerclimb {
		status("Editing save location");
		let mut event_block = cstc::EventBlock::read_from_pe(&output_exe_path).await?;
		rebase_towerclimb_save_path(&mut event_block, &mod_info.unique_name()).await?;
		event_block.write_to_pe(&output_exe_path)?;
	}

	status("Running executable");
	crate::run_game(&output_exe_path).await?;
	Ok(())
}

/// Remove events that hide the mouse cursor
/// (useful because otherwise the mouse cursor will be invisible while using the debugger window)
pub fn remove_mouse_cursor_hide_events(events: &mut cstc::EventBlock) {
	// FIXME make this less brittle
	if let Some(cstc::SomeEvent::Event(e)) = events.layout_sheets[0].iter_mut().find(|e| match e {
		cstc::SomeEvent::Event(e) if e.line_number == 14 => true,
		_ => false,
	}) {
		e.actions.retain(|act| act.object_id != 12 && act.action_id != 255)
	}
}

#[instrument]
pub async fn rebase_towerclimb_save_path(events: &mut cstc::EventBlock, unique_name: &str) -> Result<()> {
	// FIXME make this less brittle

	let appdata_suffix = format!("{}{}{}", r"TowerClimb\Mods\", unique_name, r"\");

	for event in events.layout_sheets[0].iter_mut() {
		if let cstc::SomeEvent::Event(event) = event {
			if let Some(cstc::SomeEvent::EventGroup(event)) = event.events.first_mut() {
				if let Some(cstc::SomeEvent::Event(event)) = event.events.first_mut() {
					for action in event.actions.iter_mut().chain(event.events.iter_mut().filter_map(|e| {
						if let cstc::SomeEvent::Event(e) = e {
							return Some(e)
						} else {
							return None
						}
					}).flat_map(|e| {
						e.actions.iter_mut()
					})) {
						if action.object_id == -1 && action.action_id == 20 {
							for param in &mut action.params {
								for token in param.iter_mut() {
									if let cstc::Token::StringLiteral(s) = token {
										if s.contains(r"\TowerClimb\") {
											*s = s.replace(r"\TowerClimb\", &format!(r"\{appdata_suffix}"));
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}
	let settings_dir_path = PathBuf::from_iter([crate::get_appdata_dir_path(), PathBuf::from(r"Towerclimb\Settings")]);
	let settings_dir_dest_path = PathBuf::from_iter([crate::get_appdata_dir_path(), PathBuf::from_iter([&*appdata_suffix, "Settings"])]);

	// Copy settings from vanilla game if none exists for the mod
	crate::merge_copy_into(&settings_dir_path, &settings_dir_dest_path, false, false).await?;
	Ok(())
}

#[instrument]
pub async fn patch_with_images(game_path: &Path, mut found_images_by_id: HashMap<i32, Vec<u8>>, image_metadatas: Option<Vec<cstc::ImageMetadata>>) -> Result<Vec<cstc::ImageResource>> {
	// read base imageblock from PE
	let mut base_image_block = cstc::ImageBlock::read_from_pe(game_path).await?;

	if let Some(image_metadatas) = image_metadatas {
		// add base images to found_images_by_id
		for image_resource in base_image_block {
			if !found_images_by_id.contains_key(&image_resource.id) {
				found_images_by_id.insert(image_resource.id, image_resource.data);
			}
		}

		let mut image_block = Vec::with_capacity(image_metadatas.len());
		for metadata in image_metadatas {
			let id = metadata.id;
			image_block.push(
				cstc::ImageResource::new(metadata, found_images_by_id.remove(&id).ok_or_else(|| anyhow::anyhow!("Could not find image {id}"))?)
			)
		}
		Ok(image_block)
	} else {
		let images_by_id: RwLock<HashMap<i32, &mut cstc::ImageResource>> = RwLock::new(base_image_block.iter_mut().map(|image| {
			let id = image.id;
			(id, image)
		}).collect());

		{
			let mut images_by_id = images_by_id.write().await;
			for (i, data) in found_images_by_id.into_iter() {
				if let Some(image) = images_by_id.get_mut(&i) {
					image.data = data;
				};
			}
		}

		Ok(base_image_block)
	}
}

#[instrument]
#[command]
pub async fn set_game(file_path: Option<PathBuf>) -> Result<()> {
	if let Some(file_path) = file_path {
		let game = Game::from_path(file_path.clone()).await?;
		STORE.dispatch(AppAction::SetGame(Some(game))).await;
		// Update config with new game path
		STORE.dispatch(ConfigAction::SetConfig(TowermodConfig {
			game_path: Some(file_path)
		}).into()).await;
		// Attempt to save updated config
		let _ = log_error(thunks::save_config().await, "");
	} else {
		STORE.dispatch(AppAction::SetGame(None)).await;
	}
	Ok(())
}

#[instrument]
#[command]
pub async fn new_project() -> Result<()> {
	let game = selectors::get_game().await.context("No game set")?;
	let game_path = game.game_path()?;
	let data = CstcData::default();
	dump_images().await?;

	let result: anyhow::Result<_> = tokio::try_join!(
		LevelBlock::read_from_pe(&game_path),
		AppBlock::read_from_pe(&game_path),
		EventBlock::read_from_pe(&game_path),
		ensure_base_data(data, &game),
	);
	let (level_block, app_block, event_block, mut data) = result?;

	data.app_block = Some(app_block);
	data.event_block = Some(event_block);
	data.animations = level_block.animations;
	data.object_types = level_block.object_types;
	data.layouts = level_block.layouts;
	data.behaviors = level_block.behaviors;
	data.traits = level_block.traits;
	data.families = level_block.families;
	data.containers = level_block.containers;

	STORE.dispatch(DataAction::SetData(data).into()).await;

	Ok(())
}

#[command]
pub async fn export_from_files() {
	todo!()
}

#[command]
pub async fn export_from_legacy() {

}

#[command]
pub async fn play_project() {
	todo!()
}

#[command]
pub async fn play_vanilla() -> Result<()> {
	let game = selectors::get_game().await.context("No game set")?;
	crate::run_game(game.game_path()?).await?;
	Ok(())
}

#[command]
pub async fn load_project_preflight(manifest_path: PathBuf) -> Result<Option<String>> {
	let proj = Project::from_path(&manifest_path).await?;
	if proj.project_type != ProjectType::Towermod {
		anyhow::bail!("Project manifest of type {:?} cannot be loaded as a TowerMod project", proj.project_type);
	}
	let game = selectors::get_game().await.context("No game set")?;
	if !(proj.game.file_hash == game.file_hash) {
		// Warn if project and current game differ
		let msg = indoc::formatdoc!(r#"
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
		"#, proj.name, proj.game.file_name, proj.game.file_size, proj.game.file_hash, game.file_name, game.file_size, game.file_hash);
		return Ok(Some(msg));
	}
	Ok(None)
}

#[command]
pub async fn dump_images() -> Result<()> {
	let game = selectors::get_game().await.context("No game set")?;
	let image_dump_dir = game.image_dump_dir().await?;
	let images = cstc::ImageBlock::read_from_pe(game.game_path()?).await?;

	unsafe {TokioScope::scope_and_collect(|s| {
		for image in &images {
			s.spawn(fs::write(
				image_dump_dir.join(format!("{}.png", image.id)),
				&image.data,
			));
		}
	})}.await;
	Ok(())
}

#[command]
pub async fn load_project(manifest_path: PathBuf) -> Result<()> {
	let game = selectors::get_game().await.context("No game set")?;
	let proj_dir = manifest_path.parent().unwrap();

	let result = tokio::try_join!(
		fs::read(proj_dir.join("levelblock.json")),
		fs::read(proj_dir.join("appblock.json")),
		fs::read(proj_dir.join("eventblock.json")),
		async {
			match fs::read(proj_dir.join("imageblock.json")).await {
				Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
				Err(e) => Err(e)?,
				Ok(b) => Ok(Some(b)),
			}
		},
	);
	let (level_block_json, app_block_json, event_block_json, image_block_json) = result?;

	let mut data = CstcData::default();

	let level_block: cstc::LevelBlock = serde_json::from_slice(&level_block_json).unwrap();
	let app_block: cstc::AppBlock = serde_json::from_slice(&app_block_json).unwrap();
	let event_block: cstc::EventBlock = serde_json::from_slice(&event_block_json).unwrap();
	let image_block: Option<Vec<cstc::ImageMetadata>> = image_block_json.map(|o| serde_json::from_slice(&o).unwrap());

	if let Some(image_block) = image_block {
		data.image_block = image_block;
	}
	data.app_block = Some(app_block);
	data.event_block = Some(event_block);
	data.animations = level_block.animations;
	data.object_types = level_block.object_types;
	data.layouts = level_block.layouts;
	data.behaviors = level_block.behaviors;
	data.traits = level_block.traits;
	data.families = level_block.families;
	data.containers = level_block.containers;

	let data = ensure_base_data(data, &game).await?;

	STORE.dispatch(DataAction::SetData(data).into()).await;
	Ok(())
}

// #[command]
// pub async fn save_project(dir_path: PathBuf) -> Result<()> {
// 	let game = selectors::get_game().await.context("No game set")?;
// 	let project = selectors::get_project().await.context("No project set")?;

// 	// Update date & version
// 	project.dir_path = Some(dir_path.clone());
// 	project.date = time::OffsetDateTime::now_utc().replace_nanosecond(0)?.replace_second(0)?;
// 	project.towermod_version = crate::VERSION.to_string();
// 	project.game = game;
// 	// Save manifest.toml
// 	project.save_to(&dir_path.join("manifest.toml")).await?;

// 	let (level_block, app_block, event_block, image_block) = {
// 		app!(this);
// 		let data = this.data.bind();
// 		data.get_data()
// 	};
// 	let level_block_json = serde_json::to_vec(&level_block)?;
// 	let app_block_json = serde_json::to_vec(&app_block)?;
// 	let event_block_json = serde_json::to_vec(&event_block)?;
// 	let image_block_json = serde_json::to_vec(&image_block)?;
// 	fs::write(proj_dir.join("imageblock.json"), &image_block_json).await?;
// 	fs::write(proj_dir.join("levelblock.json"), &level_block_json).await?;
// 	fs::write(proj_dir.join("appblock.json"), &app_block_json).await?;
// 	fs::write(proj_dir.join("eventblock.json"), &event_block_json).await?;

// 	Towermod::emit("active_project_updated", &[true.to_variant()]);
// }

#[command]
pub async fn edit_project_info(project: Project) {
	STORE.dispatch(AppAction::EditProjectInfo(project)).await;
}


#[command]
pub async fn clear_game_cache() -> Result<()> {
	let game = selectors::get_game().await.context("No game set")?;
	game.clear_cache().await?;
	Ok(())
}

#[command]
pub async fn nuke_cache() -> Result<()> {
	let path = crate::get_cache_dir_path();
	fs::remove_dir_all(path).await?;
	set_game(None).await?;
	Ok(())
}

#[instrument]
async fn ensure_base_data(mut data: CstcData, game: &Game) -> Result<CstcData> {
	if data.image_block.is_empty() {
		status("Initializing image data");
		let image_block = cstc::ImageBlock::read_from_pe(game.game_path()?).await?;
		data.image_block = image_block.into_iter().map(|d| d.into()).collect();
	}
	if data.editor_plugins.is_empty() {
		status("Loading Construct Classic plugin data");
		let (mut editor_plugins, _) = game.load_editor_plugins().await?;

		editor_plugins.insert(-1, cstc::get_system_plugin());

		status("Loading");
		data.editor_plugins = editor_plugins.into_iter().map(|(k, v)| (k, v)).collect();
	}
	Ok(data)
}

// fn into_blocks(data: CstcData) -> (Option<AppBlock>, Option<EventBlock>, ImageBlock, LevelBlock) {
// 	(
// 		self.app_block,
// 		self.event_block,
// 		self.image_block.into(),
// 		LevelBlock {
// 			object_types: self.object_types,
// 			behaviors: self.behaviors,
// 			traits: self.traits,
// 			families: self.families,
// 			layouts: self.layouts,
// 			containers: self.containers,
// 			animations: self.animations,
// 		}
// 	)
// }


mod images {
	use crate::cstc::ImageMetadata;

	fn restore_image_block_images(image_block: Vec<ImageMetadata>) {
	}
}
