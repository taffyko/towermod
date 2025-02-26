use serde::{Deserialize, Serialize};
use towermod_cstc::stable::*;
use super::super::selectors;

use crate::cstc_editing::{CstcData, EdLayout, EdLayoutLayer, EdObjectInstance};

#[derive(Default, Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
/// Subset of state held by frontend Redux
pub struct JsCstcData {
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
	SetData(CstcData),
	SetImageMetadata (ImageMetadata),

	UpdateObjectType(ObjectType),
	CreateObjectType { id: i32, plugin_id: i32 },
	DeleteObjectType(i32),

	UpdateObjectInstance(EdObjectInstance),
	CreateObjectInstance { id: i32, object_type_id: i32, layout_layer_id: i32 },
	DeleteObjectInstance(i32),

	UpdateLayout(EdLayout),

	UpdateLayoutLayer(EdLayoutLayer),

	UpdateAnimation(Animation),

	UpdateBehavior(Behavior),

	UpdateContainer(Container),

	UpdateFamily(Family),

	UpdateTrait(ObjectTrait),

	UpdateAppBlock(AppBlock),
}
impl From<Action> for super::app_state::Action {
	fn from(value: Action) -> Self {
		Self::Data(value)
	}
}

pub fn reducer(mut s: super::app_state::State, action: Action) -> super::app_state::State {
	match (action) {
		Action::SetData(new_state) => s.data = new_state,
		Action::SetImageMetadata(metadata) => {
			let index = s.data.image_block.iter().position(|img| img.id == metadata.id);
			if let Some(index) = index {
				s.data.image_block[index] = metadata;
			} else {
				s.data.image_block.push(metadata);
			}
		},

		Action::UpdateObjectType(obj) => {
			if let Some(original_obj) = selectors::select_object_type_mut(obj.id)(&mut s) {
				*original_obj = obj;
			}
		},
		Action::CreateObjectType { id, plugin_id } => {
			s.data.object_types.push(towermod_cstc::ObjectType {
				id,
				plugin_id,
				name: format!("obj{id}"),
				..Default::default()
			});
		},
		Action::DeleteObjectType(id) => {
			s.data.object_types.retain(|o| o.id != id);
			todo!() // delete all object instances of this type
		},

		Action::UpdateObjectInstance(obj) => {
			if let Some(original_obj) = selectors::select_object_instance_mut(obj.id)(&mut s) {
				*original_obj = obj;
			}
		},
		Action::CreateObjectInstance { id, object_type_id, layout_layer_id } => {
			let Some(plugin_name) = selectors::select_object_type_plugin_name(object_type_id)(&s).cloned() else { return s };

			'outer: for layout in &mut s.data.layouts {
				for layer in &mut layout.layers {
					if layer.id == layout_layer_id {
						layer.objects.push(EdObjectInstance {
							id,
							object_type_id,
							data: towermod_cstc::ObjectData::new(&plugin_name),
							..Default::default()
						});
						break 'outer;
					}
				}
			}
		}
		Action::DeleteObjectInstance(id) => {
			for layout in &mut s.data.layouts {
				for layer in &mut layout.layers {
					layer.objects.retain(|o| o.id != id);
				}
			}
		},

		Action::UpdateLayout(mut layout) => {
			if let Some(original_layout) = selectors::select_layout_mut(layout.name.clone())(&mut s) {
				std::mem::swap(&mut layout.layers, &mut original_layout.layers);
				*original_layout = layout;
			}
		},

		Action::UpdateLayoutLayer(mut layer) => {
			if let Some(original_layer) = selectors::select_layout_layer_mut(layer.id)(&mut s) {
				std::mem::swap(&mut layer.objects, &mut original_layer.objects);
				*original_layer = layer;
			}
		},

		Action::UpdateAnimation(mut anim) => {
			if let Some(original_anim) = selectors::select_animation_mut(anim.id)(&mut s) {
				std::mem::swap(&mut anim.sub_animations, &mut original_anim.sub_animations);
				*original_anim = anim;
			}
		},

		Action::UpdateBehavior(behavior) => {
			if let Some(original_behavior) = selectors::select_behavior_mut(behavior.object_type_id, behavior.mov_index)(&mut s) {
				*original_behavior = behavior;
			}
		},

		Action::UpdateContainer(container) => {
			if container.object_ids.len() == 0 { return s }
			if let Some(original_container) = selectors::select_container_mut(container.object_ids[0])(&mut s) {
				*original_container = container;
			}
		},

		Action::UpdateFamily(family) => {
			if let Some(original_family) = selectors::select_family_mut(family.name.clone())(&mut s) {
				*original_family = family;
			}
		},

		Action::UpdateTrait(trait_) => {
			if let Some(original_trait) = selectors::select_trait_mut(trait_.name.clone())(&mut s) {
				*original_trait = trait_;
			}
		},

		Action::UpdateAppBlock(app_block) => {
			s.data.app_block = Some(app_block);
		},
	}
	s
}
