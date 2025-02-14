use std::{collections::HashMap, io::{Cursor, Read, Write}, path::{Path, PathBuf}, sync::Mutex};
use crate::{app::state::{AppAction, ConfigAction, DataAction, TowermodConfig, STORE}, async_cleanup, convert_to_release_build, cstc::{self, plugin::PluginData, *}, first_time_setup, get_appdata_dir_path, get_mods_dir_path, get_temp_file, log_error, zip_merge_copy_into, Game, GameType, ModInfo, ModType, Nt, PeResource, Project, ProjectType, TcrepainterPatch, ZipWriterExt};
use anyhow::Result;
use async_scoped::TokioScope;
use tauri::command;
use anyhow::{Context};
use fs_err::tokio as fs;
use futures::StreamExt;
use tokio::{io::AsyncWriteExt, sync::RwLock};
use tracing::instrument;
use itertools::Itertools;
use crate::etc::game_images as images;
use crate::app::{state::{select, CstcData}, selectors, thunks};

fn status(_msg: &str) {
	// TODO
}

static INITIALIZED: std::sync::Mutex<bool> = std::sync::Mutex::new(false);

/// Should be idempotent
#[command]
pub async fn init() -> Result<()> {
	if (!*INITIALIZED.lock().unwrap()) {
		std::env::set_var("RUST_BACKTRACE", "1");

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
				if !(file_name.ends_with(".towermod") || file_name.ends_with(".zip")) { continue }
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
	let mut zip = zip::ZipArchive::new(cursor)?;

	let mut mod_info: ModInfo = {
		let mut file = zip.by_name("manifest.toml")?;
		let mut s = String::new();
		file.read_to_string(&mut s)?;
		toml::from_str(&s)?
	};

	if mod_info.game.data_hash != game.data_hash {
		anyhow::bail!("mod and currently selected game do not match");
	}
	mod_info.game = game.clone();

	// run existing mod if it's already been patched
	if let Ok(()) = run_patched_mod(&mod_info).await {
		return Ok(())
	}

	let game_path = mod_info.game.game_path()?.clone();
	let runtime_dir = mod_info.mod_runtime_dir().await?;

	status("Copying base game files");
	crate::merge_copy_into(&game_path.parent().context("game_path.parent()")?, &runtime_dir, true, true).await?;

	status("Writing custom files");
	let is_towerclimb = mod_info.game.game_type == GameType::Towerclimb;

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
		let images_by_id = images::images_from_zip(zip_path).await?;
		patch.patch(&images_by_id, std::io::Cursor::new(&mut bytes))?;
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
		let image_block = cstc::ImageBlock::read_from_pe(&game_path).await?;
		let (images, mut metadatas) = images::split_imageblock(image_block);
		let src_exe_path = mod_info.game.get_release_build().await?;
		fs::copy(&src_exe_path, &output_exe_path).await?;

		if mod_info.mod_type == ModType::BinaryPatch {
			let level_block_patch: Mutex<Option<Vec<u8>>> = Mutex::new(None);
			let event_block_patch: Mutex<Option<Vec<u8>>> = Mutex::new(None);
			let app_block_patch: Mutex<Option<Vec<u8>>> = Mutex::new(None);
			let image_block_patch: Mutex<Option<Vec<u8>>> = Mutex::new(None);

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
					*image_block_patch.lock().unwrap() = Some(buf);
				};
			}

			status("Patching executable");
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
			if let Some(image_block_patch) = image_block_patch.into_inner().unwrap() {
				metadatas = images::apply_imageblock_metadata_patch(metadatas, image_block_patch)?;
			}
		}

		let patched_image_block = images::get_patched_image_block(images, Some(zip_path), metadatas).await?;
		patched_image_block.write_to_pe(&output_exe_path)?;
	}

	if is_towerclimb {
		status("Editing save location");
		let mut event_block = cstc::EventBlock::read_from_pe(&output_exe_path).await?;
		rebase_towerclimb_save_path(&mut event_block, &mod_info.unique_name()).await?;
		event_block.write_to_pe(&output_exe_path)?;
	}

	status("Running executable");
	run_patched_mod(&mod_info).await?;
	Ok(())
}

#[command]
pub fn mod_cache_exists(mod_info: ModInfo) -> bool {
	mod_info.mod_runtime_dir_path().exists()
}

#[command]
pub async fn clear_mod_cache(mod_info: ModInfo) -> Result<()> {
	fs::remove_dir_all(mod_info.mod_runtime_dir_path()).await?;
	Ok(())
}


async fn run_patched_mod(mod_info: &ModInfo) -> Result<()> {
	let game_path = mod_info.game.game_path()?.clone();
	let runtime_dir = mod_info.mod_runtime_dir().await?;
	let game_name = game_path.file_name().unwrap();
	let output_exe_path = runtime_dir.join(game_name);

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

#[instrument(skip(events))]
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
	// dump_images().await?;

	let result: anyhow::Result<_> = tokio::try_join!(
		LevelBlock::read_from_pe(&game_path),
		AppBlock::read_from_pe(&game_path),
		EventBlock::read_from_pe(&game_path),
		ensure_base_data(data, &game),
	);
	let (level_block, app_block, event_block, mut data) = result?;
	data.set_appblock(app_block);
	data.set_eventblock(event_block);
	data.set_levelblock(level_block);

	STORE.dispatch(DataAction::SetData(data).into()).await;

	Ok(())
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

	let project = Project::from_path(&manifest_path).await?;

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

	let level_block: cstc::LevelBlock = serde_json::from_slice(&level_block_json)?;
	let app_block: cstc::AppBlock = serde_json::from_slice(&app_block_json)?;
	let event_block: cstc::EventBlock = serde_json::from_slice(&event_block_json)?;
	let image_block: Option<Vec<cstc::ImageMetadata>> = image_block_json.map(|o| serde_json::from_slice(&o)).transpose()?;

	if let Some(image_block) = image_block {
		data.image_block = image_block;
	}
	data.set_appblock(app_block);
	data.set_eventblock(event_block);
	data.set_levelblock(level_block);

	let data = ensure_base_data(data, &game).await?;

	STORE.dispatch(AppAction::SetProject(Some(project)).into()).await;
	STORE.dispatch(DataAction::SetData(data).into()).await;
	Ok(())
}

#[command]
pub async fn save_new_project(dir_path: PathBuf, author: String, name: String, display_name: String) -> Result<()> {
	let game = selectors::get_game().await.context("No game set")?;
	let mut project = Project::new(author, name, display_name, "0.0.1".to_string(), game);
	project.dir_path = Some(PathBuf::from(&dir_path));
	fs::create_dir_all(project.images_path()?).await?;
	fs::create_dir_all(project.files_path()?).await?;
	fs::create_dir_all(project.savefiles_path()?).await?;
	STORE.dispatch(AppAction::SetProject(Some(project)).into()).await;
	save_project(dir_path).await?;
	Ok(())
}

#[command]
pub async fn save_project(dir_path: PathBuf) -> Result<()> {
	let game = selectors::get_game().await.context("No game set")?;
	let mut project = selectors::get_project().await.context("No project set")?;

	// Update date & version
	project.dir_path = Some(dir_path.clone());
	project.date = time::OffsetDateTime::now_utc().replace_nanosecond(0)?.replace_second(0)?;
	project.towermod_version = crate::VERSION.to_string();
	project.game = game;
	// Save manifest.toml
	project.save().await?;
	STORE.dispatch(AppAction::EditProjectInfo(project)).await;

	let data = select(|s| s.data.clone()).await;
	let (level_block, app_block, event_block, image_block) = data.into_blocks();

	let ((), results) = unsafe {TokioScope::scope_and_collect(|s| {
		s.spawn_blocking(|| serde_json::to_vec(&level_block));
		s.spawn_blocking(|| serde_json::to_vec(&app_block));
		s.spawn_blocking(|| serde_json::to_vec(&event_block));
		s.spawn_blocking(|| serde_json::to_vec(&image_block));
	})}.await;
	let Some((v1, v2, v3, v4)) = results.into_iter().collect_tuple() else { panic!() };
	let level_block_json = v1??;
	let app_block_json = v2??;
	let event_block_json = v3??;
	let image_block_json = v4??;

	let ((), results) = unsafe {TokioScope::scope_and_collect(|s| {
		s.spawn(async {
			fs::write(dir_path.join("levelblock.json"), &level_block_json).await?;
			anyhow::Ok(())
		});
		s.spawn(async {
			fs::write(dir_path.join("appblock.json"), &app_block_json).await?;
			Ok(())
		});
		s.spawn(async {
			// until the eventblock editor is out, don't bother overwriting this file
			let event_block_path = dir_path.join("eventblock.json");
			if !event_block_path.exists() {
				fs::write(event_block_path, &event_block_json).await?;
			}
			Ok(())
		});
		s.spawn(async {
			fs::write(dir_path.join("imageblock.json"), &image_block_json).await?;
			Ok(())
		});
	})}.await;
	for result in results { result?? }

	Ok(())
}

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

#[instrument(skip(data, game))]
async fn ensure_base_data(mut data: CstcData, game: &Game) -> Result<CstcData> {
	if data.image_block.is_empty() {
		status("Initializing image data");
		let image_block = cstc::ImageBlock::read_from_pe(game.game_path()?).await?;
		data.set_imageblock(image_block);
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

#[command]
pub async fn export_mod(mod_type: ModType) -> Result<()> {
	status("Exporting");
	let mod_type: ModType = From::from(mod_type);
	let project = selectors::get_project().await.context("Project not set")?;
	let game = selectors::get_game().await.context("Game not set")?;
	let game_path = game.game_path()?.clone();
	let project_dir = project.dir_path()?.clone();
	let images_path = project.images_path()?;
	let files_path = project.files_path()?;
	let savefiles_path = project.savefiles_path()?;

	let mut buffer = vec![];
	let mut zip = zip::ZipWriter::new(Cursor::new(&mut buffer));
	let options: zip::write::FileOptions<'_, ()> = zip::write::FileOptions::default().compression_method(zip::CompressionMethod::Deflated);

	if mod_type == ModType::BinaryPatch {
		let mut level_block_patch = Vec::new();
		let mut app_block_patch = Vec::new();
		let mut event_block_patch = Vec::new();
		let mut image_metadata_patch = Vec::new();
		{
			let original_level_block_bin = cstc::LevelBlock::read_bin(&game_path)?;
			let original_app_block_bin = cstc::AppBlock::read_bin(&game_path)?;
			let original_event_block_bin = cstc::EventBlock::read_bin(&game_path)?;
			let original_image_block_bin = cstc::ImageBlock::read_bin(&game_path)?;

			let data = select(|s| s.data.clone()).await;
			let (level_block, app_block, event_block, image_metadatas) = data.into_blocks();

			status("Generating patches");
			let ((), results) = unsafe {TokioScope::scope_and_collect(|s| {
				s.spawn_blocking(|| {
					let level_block_bin = level_block.to_bin()?;
					level_block_patch = crate::etc::diff(&original_level_block_bin, &level_block_bin)?;
					anyhow::Ok(())
				});
				s.spawn_blocking(|| {
					let app_block_bin = app_block.to_bin()?;
					app_block_patch = crate::etc::diff(&original_app_block_bin, &app_block_bin)?;
					anyhow::Ok(())
				});
				s.spawn_blocking(|| {
					let event_block_bin = event_block.to_bin()?;
					event_block_patch = crate::etc::diff(&original_event_block_bin, &event_block_bin)?;
					anyhow::Ok(())
				});
				s.spawn_blocking(|| {
					let image_block = ImageBlock::from_bin(&original_image_block_bin)?;
					let (_images, original_metadata) = images::split_imageblock(image_block);
					image_metadata_patch = images::create_imageblock_metadata_patch(original_metadata, image_metadatas)?;
					anyhow::Ok(())
				})
			})}.await;
			for result in results {
				result??;
			}
		}
		{
			status("Zipping patches");
			zip.start_file("levelblock.patch", options)?;
			zip.write_all(&level_block_patch)?;
			zip.start_file("eventblock.patch", options)?;
			zip.write_all(&event_block_patch)?;
			zip.start_file("appblock.patch", options)?;
			zip.write_all(&app_block_patch)?;
			zip.start_file("imageblock.patch", options)?;
			zip.write_all(&image_metadata_patch)?;
		}
	}


	zip.add_file_if_exists(project_dir.join("cover.png"), options).await?;
	zip.add_file_if_exists(project_dir.join("icon.png"), options).await?;

	zip.add_dir_if_exists(&images_path, options).await?;
	zip.add_dir_if_exists(&files_path, options).await?;
	zip.add_dir_if_exists(&savefiles_path, options).await?;

	let mod_info = ModInfo::new(project, mod_type);
	status("Writing zip file");
	let s = mod_info.serialize()?;
	zip.start_file("manifest.toml", options)?;
	zip.write_all(s.as_bytes())?;
	zip.finish()?;
	let mut file = fs::File::create(&mod_info.export_path()).await?;
	file.write_all(&buffer).await?;

	Ok(())
}

pub async fn get_patched_image_block_load_game(dir_or_zip: Option<PathBuf>, metadata: Option<Vec<ImageMetadata>>) -> Result<ImageBlock> {
	let game = selectors::get_game().await.context("No game set")?;
	let (images, base_metadata) = images::images_from_game(game.game_path()?).await?;
	let metadata = metadata.unwrap_or(base_metadata);
	images::get_patched_image_block(images, dir_or_zip, metadata).await
}

// async fn hydrate_image_block(image_metadatas: Vec<ImageMetadata>) -> Result<()> {
// 	let game = selectors::get_game().await.context("No game set")?;
// 	let base_image_block = cstc::ImageBlock::read_from_pe(game.game_path()?).await?;
// 	let mut images = base_image_block.into_iter().map(|d| d.data);
// 	todo!()
// }
