use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use crate::{cstc::{stable::*, plugin::PluginData}, Nt};
use super::{app_state::AppStore};

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
	pub image_block: Vec<ImageResource>,
}

#[derive(Default, Clone, Debug, Serialize, Deserialize)]
/// Subset of state held by frontend Redux
pub struct JsCstcData {
	pub editor_plugins: HashMap<i32, PluginData>,
	pub object_types: Vec<ObjectType>,
	pub behaviors: Vec<Behavior>,
	pub traits: Vec<ObjectTrait>,
	pub families: Vec<Family>,
	pub layouts: Vec<Layout>,
	pub containers: Vec<Container>,
	pub animations: Vec<Animation>,
	pub app_block: Option<AppBlock>,
}
impl From<CstcData> for JsCstcData {
	fn from(value: CstcData) -> Self {
		Self {
			editor_plugins: value.editor_plugins,
			object_types: value.object_types,
			behaviors: value.behaviors,
			traits: value.traits,
			families: value.families,
			layouts: value.layouts,
			containers: value.containers,
			animations: value.animations,
			app_block: value.app_block,
		}
	}
}


pub type State = CstcData;

pub enum Action {
	SetData(CstcData),
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
		Action::SetData(state) => state,
		Action::AddObjectInstance { layout_layer_id, object_type_id } => todo!(),
		Action::RemoveObjectInstance { id } => todo!(),
	}
}
