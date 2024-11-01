use std::{collections::HashMap, io::{Cursor, Read}, path::{Path, PathBuf}, sync::Mutex};

use crate::{async_cleanup, convert_to_release_build, cstc::{self, *, plugin::PluginData}, get_appdata_dir_path, get_mods_dir_path, get_temp_file, tcr::TcrepainterPatch, util::zip_merge_copy_into, Game, GameType, ModInfo, ModType, Nt, PeResource};
use anyhow::{Result, Context};
use fs_err::tokio as fs;
use futures::StreamExt;
use napi_derive::napi;
use tokio::sync::RwLock;
use tracing::instrument;

fn status(_msg: &str) {
	// TODO
}

#[napi(ts_args_type = "gamePath: string")]
pub async fn run_game(Nt(ref game_path): Nt<PathBuf>) -> Result<()> {
	crate::run_game(game_path).await?;
	Ok(())
}

#[napi]
pub async fn list_installed_mods() -> Result<Vec<ModInfo>> {

	let mut stream = fs::read_dir(get_mods_dir_path()).await?;
	let mut mods: Vec<ModInfo> = Vec::new();
	while let Some(entry) = stream.next_entry().await? {
		let meta = entry.metadata().await?;
		if meta.is_file() {
			let path = entry.path();
			let file_name = path.file_name().context("bad filename")?.to_string_lossy();
			if let Result::<_>::Err(_e) = try {
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
				mod_info.file_path = Some(path.clone().into());
				mods.push(mod_info);
			} {
				// FIXME
				// crate::util::show_error(e.context(format!("Error reading mod: {file_name:?}")));
				continue
			};
		}
	}
	Ok(mods)
}

#[napi]
pub async fn play_mod(Nt(zip_path): Nt<PathBuf>, game: Game) -> Result<()> {
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
	crate::util::merge_copy_into(&game_path.parent().context("game_path.parent()")?, &runtime_dir, true, true).await?;

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
				let buf = crate::util::apply_patch(&*level_block_bin, &*level_block_patch)?;
				cstc::LevelBlock::write_bin(&output_exe_path, &buf)?;
			}
			if let Some(event_block_patch) = event_block_patch.into_inner().unwrap() {
				let event_block_bin = cstc::EventBlock::read_bin(&game_path)?;
				let buf = crate::util::apply_patch(&*event_block_bin, &*event_block_patch)?;
				cstc::EventBlock::write_bin(&output_exe_path, &buf)?;
			}
			if let Some(app_block_patch) = app_block_patch.into_inner().unwrap() {
				let app_block_bin = cstc::AppBlock::read_bin(&game_path)?;
				let buf = crate::util::apply_patch(&*app_block_bin, &*app_block_patch)?;
				cstc::AppBlock::write_bin(&output_exe_path, &buf)?;
			}
		}
	}


	if is_towerclimb {
		status("Editing save location");
		let mut event_block = cstc::EventBlock::read_from_pe(&output_exe_path)?;
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
	crate::util::merge_copy_into(&settings_dir_path, &settings_dir_dest_path, false, false).await?;
	Ok(())
}

#[instrument]
pub async fn patch_with_images(game_path: &Path, mut found_images_by_id: HashMap<i32, Vec<u8>>, image_metadatas: Option<Vec<cstc::ImageMetadata>>) -> Result<Vec<cstc::ImageResource>> {
	// read base imageblock from PE
	let mut base_image_block = cstc::ImageBlock::read_from_pe(game_path)?;

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

#[napi(ts_args_type = "filePath: string")]
#[instrument]
async fn game_from_path(Nt(file_path): Nt<PathBuf>) -> Result<Game> {
	Game::from_path(file_path).await
}

#[napi(object)]
#[derive(Default, Clone, Debug)]
pub struct CstcData {
	#[napi(ts_type = "Record<number, PluginData>")]
	pub editor_plugins: Nt<HashMap<i32, PluginData>>,
	pub object_types: Vec<ObjectType>,
	pub behaviors: Vec<Behavior>,
	pub traits: Vec<ObjectTrait>,
	pub families: Vec<Family>,
	pub layouts: Vec<Layout>,
	pub containers: Vec<Container>,
	pub animations: Vec<Animation>,
	pub app_block: Option<AppBlock>,
	// pub event_block: Option<EventBlock>,
	pub image_block: Vec<ImageResource>,
}

#[napi]
#[instrument]
async fn new_project(game: Game) -> Result<CstcData> {
	let game_path = game.game_path()?;
	// FIXME: make async
	status("Reading levelblock");
	let level_block = LevelBlock::read_from_pe(&game_path)?;
	status("Reading appblock");
	let app_block = AppBlock::read_from_pe(&game_path)?;
	status("Reading eventblock");
	let event_block = EventBlock::read_from_pe(&game_path)?;

	let mut data = CstcData::default();

	data = ensure_base_data(data, &game).await?;
	data.app_block = Some(app_block);
	// data.event_block = Some(event_block);
	data.animations = level_block.animations;
	data.object_types = level_block.object_types;
	data.layouts = level_block.layouts;
	data.behaviors = level_block.behaviors;
	data.traits = level_block.traits;
	data.families = level_block.families;
	data.containers = level_block.containers;

	Ok(data)
}

async fn ensure_base_data(mut data: CstcData, game: &Game) -> Result<CstcData> {
	if data.image_block.is_empty() {
		status("Initializing image data");
		// TODO: make async
		let image_block = cstc::ImageBlock::read_from_pe(game.game_path()?).unwrap();
		data.image_block = image_block;
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
