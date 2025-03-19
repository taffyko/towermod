use serde::{Deserialize, Serialize};
use towermod_cstc::stable::*;
use super::super::selectors;

use crate::cstc_editing::{CstcData, EdAppBlock, EdContainer, EdFamily, EdLayout, EdLayoutLayer, EdObjectInstance, EdObjectType, VariableType, VariableValue};

pub type State = CstcData;

pub enum Action {
	SetData(CstcData),
	SetImageMetadata (ImageMetadata),

	UpdateObjectType(EdObjectType),
	CreateObjectType { id: i32, plugin_id: i32 },
	DeleteObjectType(i32),
	ObjectTypeAddVariable { id: i32, name: String, value: VariableValue },
	ObjectTypeDeleteVariable { id: i32, name: String },

	UpdateObjectInstance(EdObjectInstance),
	CreateObjectInstance { id: i32, object_type_id: i32, layout_layer_id: i32 },
	DeleteObjectInstance(i32),

	UpdateLayout(EdLayout),

	UpdateLayoutLayer(EdLayoutLayer),

	UpdateAnimation(Animation),
	CreateAnimation { id: i32, object_type_id: i32 },

	UpdateBehavior(Behavior),

	UpdateContainer(EdContainer),
	CreateContainer(i32),
	DeleteContainer(i32),

	FamilyAddObject { name: String, object_type_id: i32 },
	FamilyRemoveObject { name: String, object_type_id: i32 },
	FamilyAddVariable { name: String, var_name: String, value: VariableValue },
	FamilyDeleteVariable { name: String, var_name: String },

	UpdateTrait(ObjectTrait),
	CreateTrait(String),
	DeleteTrait(String),

	UpdateAppBlock(EdAppBlock),
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

		Action::UpdateObjectType(mut obj) => {
			if let Some(original_obj) = selectors::select_object_type_mut(obj.id)(&mut s) {
				std::mem::swap(&mut obj.private_variables, &mut original_obj.private_variables);
				*original_obj = obj;
			}
		},
		Action::CreateObjectType { id, plugin_id } => {
			s.data.object_types.insert(id, EdObjectType {
				id,
				plugin_id,
				name: format!("obj{id}"),
				..Default::default()
			});
		},
		Action::DeleteObjectType(id) => {
			s.data.object_types.shift_remove(&id);
			for layout in &mut s.data.layouts {
				for layer in &mut layout.layers {
					layer.objects.retain(|o| o.object_type_id != id);
				}
			}
		},
		Action::ObjectTypeAddVariable { id, name, value } => {
			add_private_variable(&mut s, id, name, value);
		},
		Action::ObjectTypeDeleteVariable { id, name } => {
			// fail if variable comes from family
			for family in selectors::select_object_families(id)(&s) {
				if family.private_variables.contains_key(&name) { return s };
			}
			let Some(original_obj) = selectors::select_object_type_mut(id)(&mut s) else { return s };
			if original_obj.private_variables.shift_remove(&name).is_none() { return s };
			// delete variable on instances
			for instance in selectors::select_object_instances_mut(id)(&mut s) {
				instance.private_variables.remove(&name);
			}
		}

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
			let Some(original_container) = s.data.containers.get_mut(&container.id) else { return s };
			original_container.object_ids = container.object_ids
		},
		Action::CreateContainer(id) => {
			s.data.containers.insert(id, EdContainer { id, object_ids: vec![] });
		}
		Action::DeleteContainer(id) => {
			s.data.containers.shift_remove(&id);
		}

		Action::FamilyAddObject { name, object_type_id } => {
			let Some(family) = selectors::select_family_mut(name)(&mut s) else { return s };
			if !family.object_type_ids.contains(&object_type_id) {
				family.object_type_ids.push(object_type_id);
				for (var_name, var_type) in family.private_variables.clone() {
					add_private_variable(&mut s, object_type_id, var_name, var_type.into());
				}
			}
		},
		Action::FamilyRemoveObject { name, object_type_id } => {
			let Some(family) = selectors::select_family_mut(name)(&mut s) else { return s };
			family.object_type_ids.retain(|id| *id != object_type_id);
		},
		Action::FamilyAddVariable { name, var_name, value } => {
			let Some(family) = selectors::select_family_mut(name.clone())(&mut s) else { return s };
			if family.private_variables.contains_key(&name) { return s };
			for id in family.object_type_ids.clone() {
				add_private_variable(&mut s, id, var_name.clone(), value.clone());
			}
		},
		Action::FamilyDeleteVariable { name, var_name } => {
			let Some(family) = selectors::select_family_mut(name)(&mut s) else { return s };
			family.private_variables.remove(&var_name);
		}

		Action::UpdateTrait(object_trait) => {
			if let Some(original_trait) = selectors::select_trait_mut(object_trait.name.clone())(&mut s) {
				*original_trait = object_trait;
			}
		},
		Action::CreateTrait(name) => {
			if s.data.traits.iter().any(|t| t.name == name) { return s }
			s.data.traits.push(ObjectTrait {
				name,
				object_type_ids: vec![],
			});
		},
		Action::DeleteTrait(name) => {
			s.data.traits.retain(|t| t.name != name);
		}

		Action::UpdateAppBlock(app_block) => {
			s.data.app_block = Some(app_block);
		},
	}
	s
}


fn add_private_variable(mut s: &mut super::app_state::State, id: i32, name: String, value: VariableValue) {
	let Some(original_obj) = selectors::select_object_type_mut(id)(&mut s) else { return };
	if original_obj.private_variables.contains_key(&name) { return };
	original_obj.private_variables.insert(name.clone(), (&value).into());
	for instance in selectors::select_object_instances_mut(id)(&mut s) {
		instance.private_variables.insert(name.clone(), value.clone());
	}
}
