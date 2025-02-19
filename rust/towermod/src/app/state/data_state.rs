use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use crate::cstc::{stable::*, plugin::PluginData};

#[derive(Default, Clone, Debug, Serialize, Deserialize)]
pub struct CstcData {
	pub editor_plugins: HashMap<i32, PluginData>,
	pub object_types: Vec<ObjectType>,
	pub behaviors: Vec<Behavior>,
	pub traits: Vec<ObjectTrait>,
	pub families: Vec<Family>,
	pub layouts: Vec<Layout>,
	pub containers: Vec<Container>,
	pub animations: Vec<Animation>,
	pub app_block: Option<AppBlock>,
	pub event_block: Option<EventBlock>,
	pub image_block: Vec<ImageMetadata>,
}
impl CstcData {
	pub fn set_appblock(&mut self, app_block: AppBlock) {
		self.app_block = Some(app_block);
	}
	pub fn set_imageblock(&mut self, image_block: ImageBlock) {
		self.image_block = image_block.into_iter().map(|d| d.into()).collect();
	}
	pub fn set_eventblock(&mut self, event_block: EventBlock) {
		self.event_block = Some(event_block);
	}
	pub fn set_levelblock(&mut self, level_block: LevelBlock) {
		self.animations = level_block.animations;
		self.object_types = level_block.object_types;
		self.layouts = level_block.layouts;
		self.behaviors = level_block.behaviors;
		self.traits = level_block.traits;
		self.families = level_block.families;
		self.containers = level_block.containers;
	}
	pub fn into_blocks(self) -> (LevelBlock, AppBlock, EventBlock, Vec<ImageMetadata>) {
		(
			LevelBlock {
				object_types: self.object_types,
				behaviors: self.behaviors,
				traits: self.traits,
				families: self.families,
				layouts: self.layouts,
				containers: self.containers,
				animations: self.animations,
			},
			self.app_block.unwrap(),
			self.event_block.unwrap(),
			self.image_block,
		)
	}
}

#[derive(Default, Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
/// Subset of state held by frontend Redux
pub struct JsCstcData {
	pub object_types: Vec<ObjectType>,
	pub behaviors: Vec<Behavior>,
	pub traits: Vec<ObjectTrait>,
	pub families: Vec<Family>,
	pub layouts: Vec<Layout>,
	pub containers: Vec<Container>,
	pub animations: Vec<Animation>,
	pub app_block: Option<AppBlock>,
}
impl JsCstcData {
	pub fn get(value: &CstcData) -> Self {
		Self {
			object_types: value.object_types.clone(),
			behaviors: value.behaviors.clone(),
			traits: value.traits.clone(),
			families: value.families.clone(),
			layouts: value.layouts.clone(),
			containers: value.containers.clone(),
			animations: value.animations.clone(),
			app_block: value.app_block.clone(),
		}
	}
	pub fn set(self, value: &mut CstcData) {
		value.object_types = self.object_types;
		value.behaviors = self.behaviors;
		value.traits = self.traits;
		value.families = self.families;
		value.layouts = self.layouts;
		value.containers = self.containers;
		value.animations = self.animations;
		value.app_block = self.app_block;
	}
}


pub type State = CstcData;

pub enum Action {
	UpdateData(JsCstcData),
	SetData(CstcData),
	SetImageMetadata (ImageMetadata),
	AddObjectInstance { object_type_id: i32, layout_layer_id: i32 },
	RemoveObjectInstance { id: i32 },
}
impl From<Action> for super::app_state::Action {
	fn from(value: Action) -> Self {
		Self::Data(value)
	}
}

pub fn reducer(state: State, action: Action) -> State {
	match (action) {
		Action::UpdateData(data) => {
			let mut state = state;
			data.set(&mut state);
			state
		},
		Action::SetData(state) => state,
		Action::AddObjectInstance { layout_layer_id: _, object_type_id: _ } => todo!(),
		Action::RemoveObjectInstance { id: _ } => todo!(),
		Action::SetImageMetadata(metadata) => {
			let mut state = state;
			let index = state.image_block.iter().position(|img| img.id == metadata.id);
			if let Some(index) = index {
				state.image_block[index] = metadata;
			} else {
				state.image_block.push(metadata);
			}
			state
		},
	}
}
