use std::collections::HashMap;
use napi_derive::napi;
use serde::{Deserialize, Serialize};
use crate::{cstc::{stable::*, plugin::PluginData}, Nt};

use super::{app_state::AppStore};

#[napi(object)]
#[derive(Default, Clone, Debug, Serialize, Deserialize)]
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
	pub event_block: Option<EventBlock>,
	pub image_block: Vec<ImageResource>,
}

pub type State = CstcData;

pub enum Action {
	SetData(CstcData),
	AddObjectInstance { object_type_id: i32, layout_layer_id: i32 },
	RemoveObjectInstance { id: i32 },
}
impl Action {
	pub async fn dispatch(self, store: &AppStore) -> () {
		super::app_state::Action::Data(self).dispatch(store).await;
	}
}

pub fn reducer(state: State, action: Action) -> State {
	match (action) {
		Action::SetData(state) => state,
		Action::AddObjectInstance { layout_layer_id, object_type_id } => todo!(),
		Action::RemoveObjectInstance { id } => todo!(),
	}
}
