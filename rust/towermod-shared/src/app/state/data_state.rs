use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use towermod_cstc::stable::*;

use crate::cstc_editing::{CstcData, EdLayout};

#[derive(Default, Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
/// Subset of state held by frontend Redux
pub struct JsCstcData {
	pub object_types: HashMap<i32, ObjectType>,
	pub behaviors: Vec<Behavior>,
	pub traits: Vec<ObjectTrait>,
	pub families: Vec<Family>,
	pub layouts: Vec<EdLayout>,
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
