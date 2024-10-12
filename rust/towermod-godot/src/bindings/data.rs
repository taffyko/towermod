use std::collections::HashMap;
use std::path::{PathBuf};

use anyhow::{Context, Result};
use godot::engine::Image;
use godot::prelude::*;
use godot::engine::global::weakref;
use tokio::sync::RwLock;
use futures::stream::StreamExt;
use tokio_stream::wrappers::ReadDirStream;
use towermod::PeResource;
use tracing::instrument;
use crate::app::Towermod;
use crate::util::{status};

use super::*;
use towermod::cstc::{self};

#[derive(Debug, GodotClass)]
#[class(init)]
pub struct CstcData {
	pub base: Base<RefCounted>,
	#[var] pub plugin_names: Dictionary,
	#[var] pub editor_plugins: Dictionary, // Gd<CstcPluginData>
	#[var] pub object_types: Dictionary, // Gd<CstcObjectType>
	#[var] pub behaviors: Array<Gd<CstcBehavior>>,
	#[var] pub traits: Array<Gd<CstcObjectTrait>>,
	#[var] pub families: Array<Gd<CstcFamily>>,
	#[var] pub layouts: Array<Gd<CstcLayout>>,
	#[var] pub containers: Array<Gd<CstcObjectContainer>>,
	#[var] pub animations: Array<Gd<CstcAnimation>>,
	#[var] pub app_block: Option<Gd<CstcAppBlock>>,
	#[var] pub event_block: Option<Gd<CstcEventBlock>>,
	#[var] pub images: Dictionary, // HashMap<i32, Gd<Image>>
	#[var] pub image_block: Dictionary, // HashMap<i32, Gd<CstcImageMetadata>>
	// Performant lookups by ID
	pub animations_by_id: HashMap<i32, Gd<CstcAnimation>>,
	pub object_instances_by_id: HashMap<i32, Gd<CstcObjectInstance>>,
	pub object_instances_by_type: HashMap<i32, Array<Gd<CstcObjectInstance>>>
}
#[godot_api]
impl CstcData {
	
	#[instrument]
	pub async fn images_from_dir(images_dir: &PathBuf) -> Result<HashMap<i32, Vec<u8>>> {
		let found_images_by_id: RwLock<HashMap<i32, Vec<u8>>> = RwLock::new(HashMap::new());

		// TODO: allow image metadata to be saved independently of binary data so that the actual images can continue to live as individual files on-disk
		let entries = ReadDirStream::new(match tokio::fs::read_dir(&images_dir).await {
			Ok(v) => v,
			Err(e) => match e.kind() {
				std::io::ErrorKind::NotFound => { return Ok(found_images_by_id.into_inner()) },
				_ => Err(e)?,
			}
		});
		entries.for_each_concurrent(None, |entry| async {
			let _: Result<()> = async {
				let entry = entry?;
				let path = entry.path();
				if path.file_name().context("bad filename")?.to_string_lossy().ends_with(".png") {
					if let Some(s) = path.file_stem() {
						if let Ok(id) = str::parse::<i32>(&s.to_string_lossy()) {
							match fs_err::read(path) {
								Ok(data) => {
									let mut found_images_by_id = found_images_by_id.write().await;
									found_images_by_id.insert(id, data);
								}
								Err(e) => match e.kind() {
									std::io::ErrorKind::IsADirectory => {},
									_ => Err(e)?
								}
							}
						}
					}
				}
				Ok(())
			}.await;
		}).await;
		
		Ok(found_images_by_id.into_inner())
	}
	
	/// # Errors
	/// - Game path not set
	#[instrument]
	pub async fn patch_with_images(mut found_images_by_id: HashMap<i32, Vec<u8>>, image_metadatas: Option<Vec<cstc::ImageMetadata>>) -> Result<Vec<cstc::ImageResource>> {
		let state = Towermod::state();

		// read base imageblock from PE
		let mut base_image_block = {
			let state = state.read().await;
			let game_path = state.game.as_ref().unwrap().game_path()?;
			cstc::ImageBlock::read_from_pe(game_path)?
		};
		
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

	/// # Errors
	/// - Game path not set
	#[instrument]
	pub async fn patched_imageblock(images_dir: Option<&PathBuf>, image_metadatas: Option<Vec<cstc::ImageMetadata>>) -> Result<Vec<cstc::ImageResource>> {
		let found_images_by_id = if let Some(images_dir) = images_dir { Self::images_from_dir(images_dir).await? } else { HashMap::new() };
		Self::patch_with_images(found_images_by_id, image_metadatas).await
	}

	
	pub fn get_data(&self) -> (cstc::LevelBlock, cstc::AppBlock, cstc::EventBlock, Vec<cstc::ImageMetadata>) {
		let object_types = gd_dict_to_data_vec::<CstcObjectType>(&self.object_types);
		let behaviors = gd_to_data_vec(&self.behaviors);
		let traits = gd_to_data_vec(&self.traits);
		let families = gd_to_data_vec(&self.families);
		let containers = gd_to_data_vec(&self.containers);
		let layouts = gd_to_data_vec(&self.layouts);
		let animations = gd_to_data_vec(&self.animations);

		let level_block = cstc::LevelBlock { object_types, behaviors, traits, families, containers, layouts, animations };
		let app_block = self.app_block.as_ref().unwrap().bind().to_data();
		let event_block = self.event_block.as_ref().unwrap().bind().to_data();
		let image_block = gd_dict_to_data_vec::<CstcImageMetadata>(&self.image_block);
		(level_block, app_block, event_block, image_block)
	}
	
	/// # Panics
	/// - Base data not yet set
	pub fn set_data(this: &mut Gd<CstcData>, data: (&cstc::LevelBlock, &cstc::AppBlock, &cstc::EventBlock)) {
		status!("Initializing data");
		let (level_block, app_block, event_block) = data;
		let weak: Gd<WeakRef> = weakref(this.to_variant()).to();
		this.bind_mut().animations = data_vec_to_gd(&level_block.animations, &weak);
		this.bind_mut().app_block = Some(CstcAppBlock::from_data(&app_block, weak.clone()));
		this.bind_mut().object_types = data_vec_to_dict_gd::<i32, CstcObjectType>(&level_block.object_types, &weak, |d| d.id);
		this.bind_mut().layouts = data_vec_to_gd(&level_block.layouts, &weak);
		this.bind_mut().behaviors = data_vec_to_gd(&level_block.behaviors, &weak);
		this.bind_mut().traits = data_vec_to_gd(&level_block.traits, &weak);
		this.bind_mut().families = data_vec_to_gd(&level_block.families, &weak);
		this.bind_mut().containers = data_vec_to_gd(&level_block.containers, &weak);
		this.bind_mut().event_block = Some(CstcEventBlock::from_data(&event_block, weak.clone()));
		
		// FIXME set animations by ID
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
		let settings_dir_path = PathBuf::from_iter([towermod::get_appdata_dir_path(), PathBuf::from(r"Towerclimb\Settings")]);
		let settings_dir_dest_path = PathBuf::from_iter([towermod::get_appdata_dir_path(), PathBuf::from_iter([&*appdata_suffix, "Settings"])]);
		
		// Copy settings from vanilla game if none exists for the mod
		towermod::util::merge_copy_into(&settings_dir_path, &settings_dir_dest_path, false, false).await?;
		Ok(())
	}

	pub fn update_access_maps(&mut self) {
		// objects by ID and type
		self.object_instances_by_id.clear();
		for layout in self.layouts.iter_shared() {
			for layer in layout.bind().layers.iter_shared() {
				for object in layer.bind().objects.iter_shared() {
					let object_id = object.bind().id;
					let object_type_id = object.bind().object_type_id;
					self.object_instances_by_id.insert(object_id, object.clone());
					if !self.object_instances_by_type.contains_key(&object_type_id) {
						self.object_instances_by_type.insert(object_type_id, Array::new());
					}
					let list = self.object_instances_by_type.get_mut(&object_type_id).unwrap();
					list.push(object);
				}
			}
		}
	
		// animations by id
		{
			self.animations_by_id.clear();
			fn recurse_animations(animations_by_id: &mut HashMap<i32, Gd<CstcAnimation>>, anims: &Array<Gd<CstcAnimation>>) {
				for anim in anims.iter_shared() {
					let id = anim.bind().id;
					animations_by_id.insert(id, anim.clone());
					let sub_animations = &anim.bind().sub_animations;
					recurse_animations(animations_by_id, sub_animations);
				}
			}
			recurse_animations(&mut self.animations_by_id, &mut self.animations);
		}
	}


	#[func]
	pub fn get_object_type(&self, id: i32) -> Option<Gd<CstcObjectType>> {
		self.object_types.get(id)?.try_to::<Gd<CstcObjectType>>().ok()
	}

	#[func]
	pub fn get_object(&self, id: i32) -> Option<Gd<CstcObjectInstance>> {
		self.object_instances_by_id.get(&id).cloned()
	}
	
	#[func]
	pub fn get_objects_by_type(&self, id: i32) -> Array<Gd<CstcObjectInstance>> {
		self.object_instances_by_type.get(&id).map_or_else(|| Array::new(), |a| a.clone())
	}

	#[func]
	pub fn get_animation(&self, id: i32) -> Option<Gd<CstcAnimation>> {
		self.animations_by_id.get(&id).cloned()
	}

	#[func]
	pub fn get_image(&self, id: i32) -> Option<Gd<Image>> {
		self.images.get(id)?.try_to::<Gd<Image>>().ok()
	}

	#[func]
	pub fn get_image_meta(&self, id: i32) -> Option<Gd<CstcImageMetadata>> {
		self.image_block.get(id)?.try_to::<Gd<CstcImageMetadata>>().ok()
	}

	#[func]
	pub fn get_type_of_object(&self, id: i32) -> Option<Gd<CstcObjectType>> {
		self.get_object_type(self.get_object(id)?.bind().object_type_id)
	}

	
	#[func]
	pub fn get_plugin_data(&self, id: i32) -> Option<Gd<CstcPluginData>> {
		self.editor_plugins.get(id).unwrap().try_to::<Gd<CstcPluginData>>().ok()
	}

	pub fn plugin_data_for_object_id(&self, object_id: i32) -> (Option<Gd<CstcPluginData>>, Option<Gd<CstcObjectType>>) {
		let mut plugin_data: Option<Gd<CstcPluginData>> = None;
		let mut object_type: Option<Gd<CstcObjectType>> = None;
		if object_id == -1 {
			plugin_data = self.get_plugin_data(-1);
		} else {
			object_type = self.get_object_type(object_id);
			if let Some(object_type) = &object_type {
				let object_type = object_type.bind();
				plugin_data = Some(object_type.get_plugin_data());
			};
		}
		(plugin_data, object_type)
	}
}
