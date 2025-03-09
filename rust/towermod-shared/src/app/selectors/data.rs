//! APIs for requesting data from the state

use std::{collections::HashMap};
use crate::{app::state::{app_state::State, select}, cstc_editing::{EdContainer, EdFamily, EdLayout, EdLayoutLayer, EdObjectInstance, EdObjectType}, select, serde};
use ::serde::{Deserialize, Serialize};
use towermod_cstc::{plugin::PluginData, Animation, Behavior, Container, Family, ImageMetadata, ObjectTrait, ObjectType};


pub fn select_editor_plugin(plugin_id: i32) -> impl Fn(&State) -> Option<&PluginData> {
	move |s| { s.data.editor_plugins.get(&plugin_id) }
}
pub fn select_editor_plugin_name<'a>(plugin_id: i32) -> impl Fn(&'a State) -> Option<&'a String> {
	move |s| {
		let plugin = select_editor_plugin(plugin_id)(s)?;
		Some(&plugin.string_table.name)
	}
}


pub async fn get_editor_plugin(id: i32) -> Option<PluginData> {
	select(move |s| s.data.editor_plugins.get(&id).cloned()).await
}

pub async fn get_editor_plugins() -> HashMap<i32, PluginData> {
	select(move |s| s.data.editor_plugins.clone()).await
}

pub async fn get_image_metadata(id: i32) -> Option<ImageMetadata> {
	select(move |s| s.data.image_block.iter().find(|img| img.id == id).map(|p| p.clone())).await
}

pub async fn is_data_loaded() -> bool {
	select(|s| !s.data.editor_plugins.is_empty()).await
}

pub fn select_object_type(object_type_id: i32) -> impl Fn(&State) -> Option<&EdObjectType> {
	move |s: &State| { s.data.object_types.get(&object_type_id) }
}
pub fn select_object_type_mut(object_type_id: i32) -> impl Fn(&mut State) -> Option<&mut EdObjectType> {
	move |s: &mut State| { s.data.object_types.get_mut(&object_type_id) }
}
pub fn select_object_type_plugin_name<'a>(object_type_id: i32) -> impl Fn(&'a State) -> Option<&'a String> {
	move |s| {
		let plugin_id = select_object_type(object_type_id)(s)?.plugin_id;
		select_editor_plugin_name(plugin_id)(s)
	}
}
pub fn select_object_type_image_id(object_type_id: i32) -> impl Fn(&State) -> Option<i32> {
	move |s| {
		let obj_type = select_object_type(object_type_id)(s)?;
		let plugin_name = select_editor_plugin_name(obj_type.plugin_id)(s)?;
		if plugin_name != "Sprite" { return None }
		let instance = select_object_type_first_instance(object_type_id)(s)?;
		object_instance_image_id(s, instance)
	}
}
fn object_instance_image_id(s: &State, instance: &EdObjectInstance) -> Option<i32> {
	let towermod_cstc::ObjectData::Sprite(data) = &instance.data else { return None };
	let anim_root = select_animation(data.animation)(s)?;
	let anim_section = anim_root.sub_animations.iter().find(|a| a.name == data.start_anim)?;
	let first_anim_angle = anim_section.sub_animations.first()?;
	let frame = first_anim_angle.frames.get((data.start_frame - 1) as usize)?;
	Some(frame.image_id)
}

pub fn select_object_instance_image_id(object_instance_id: i32) -> impl Fn(&State) -> Option<i32> {
	move |s| {
		let obj = select_object_instance(object_instance_id)(s)?;
		object_instance_image_id(s, obj)
	}
}

pub fn select_new_object_instance_id() -> impl Fn(&State) -> i32 {
	|s| {
		s.data.layouts.iter()
			.map(|l| l.layers.iter()
				.map(|l| l.objects.iter()
					.map(|o| o.id).max().unwrap_or(0)
				).max().unwrap_or(0)
			).max().unwrap_or(0) + 1
	}
}
pub fn select_object_instances(layout_layer_id: i32) -> impl Fn(&State) -> Vec<&EdObjectInstance> {
	move |s: &State| {
		for layout in &s.data.layouts {
			for layer in &layout.layers {
				if layer.id == layout_layer_id {
					return layer.objects.iter().collect();
				}
			}
		}
		Vec::new()
	}
}
pub fn select_object_instances_mut(layout_layer_id: i32) -> impl Fn(&mut State) -> Vec<&mut EdObjectInstance> {
	move |s: &mut State| {
		for layout in &mut s.data.layouts {
			for layer in &mut layout.layers {
				if layer.id == layout_layer_id {
					return layer.objects.iter_mut().collect();
				}
			}
		}
		Vec::new()
	}
}
pub fn select_all_object_instances<'a>(s: &'a State) -> impl Iterator<Item = &'a EdObjectInstance> {
	s.data.layouts.iter().flat_map(|l| l.layers.iter().flat_map(|l| l.objects.iter()))
}
pub fn select_object_instance_ids(layout_layer_id: i32) -> impl Fn(&State) -> Vec<i32> {
	move |s| { select_object_instances(layout_layer_id)(s).iter().map(|o| o.id).collect() }
}
pub fn select_object_type_instance_ids(object_type_id: i32) -> impl Fn(&State) -> Vec<i32> {
	move |s| {
		let object_instances: Vec<_> = select_all_object_instances(s).collect();
		object_instances.into_iter().filter_map(|o| if o.object_type_id == object_type_id { Some(o.id) } else { None }).collect()
	}
}
pub fn select_object_type_first_instance(object_type_id: i32) -> impl Fn(&State) -> Option<&EdObjectInstance> {
	move |s| { select_all_object_instances(s).find(|o| o.object_type_id == object_type_id) }
}
pub async fn search_object_instances(options: SearchOptions) -> Vec<(i32, String)> {
	select(move |s| {
		let object_instances: Vec<_> = select_all_object_instances(&s).collect();
		object_instances.iter().filter_map(|(o)| {
			let ot = s.data.object_types.get(&o.object_type_id);
			ot.map(|ot| if matches_search(&ot.name, &options) {
				Some((o.id, ot.name.clone()))
			} else { None }).flatten()
		}).collect()
	}).await
}

pub fn select_object_instance(object_instance_id: i32) -> impl Fn(&State) -> Option<&EdObjectInstance> {
	move |s: &State| {
		for layout in &s.data.layouts {
			for layer in &layout.layers {
				for obj in &layer.objects {
					if obj.id == object_instance_id {
						return Some(obj)
					}
				}
			}
		}
		None
	}
}
pub fn select_object_instance_mut(object_instance_id: i32) -> impl Fn(&mut State) -> Option<&mut EdObjectInstance> {
	move |s: &mut State| {
		for layout in &mut s.data.layouts {
			for layer in &mut layout.layers {
				for obj in &mut layer.objects {
					if obj.id == object_instance_id {
						return Some(obj)
					}
				}
			}
		}
		None
	}
}

pub fn select_object_families(object_type_id: i32) -> impl Fn(&State) -> Vec<&EdFamily> {
	move |s: &State| {
		s.data.families.iter().filter(|f| f.object_type_ids.contains(&object_type_id)).collect()
	}
}

pub fn select_object_instance_plugin(object_instance_id: i32) -> impl Fn(&State) -> Option<&PluginData> {
	move |s: &State| {
		let obj = select_object_instance(object_instance_id)(s)?;
		let obj_type = select_object_type(obj.object_type_id)(s)?;
		select_editor_plugin(obj_type.plugin_id)(s)
	}
}
pub fn select_object_instance_plugin_name<'a>(object_instance_id: i32) -> impl Fn(&'a State) -> Option<&'a String> {
	move |s| {
		let plugin = select_object_instance_plugin(object_instance_id)(s)?;
		Some(&plugin.string_table.name)
	}
}

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchOptions {
	text: String,
	#[serde(default)]
	case_sensitive: bool,
}
fn matches_search(scrutinee: &str, options: &SearchOptions) -> bool {
	if (options.case_sensitive) {
		scrutinee.contains(&options.text)
	} else {
		scrutinee.to_lowercase().contains(&options.text)
	}
}

pub fn select_new_object_type_id() -> impl Fn(&State) -> i32 {
	|s| { s.data.object_types.iter().map(|(id, _)| *id).max().unwrap_or(0) + 1 }
}
pub async fn get_object_types() -> Vec<i32> {
	select(|s| s.data.object_types.iter().map(|(id, _)| *id).collect()).await
}
pub async fn get_object_type(object_type_id: i32) -> Option<EdObjectType> {
	select!(select_object_type(object_type_id), |r| r.cloned()).await
}
pub async fn search_object_types(options: SearchOptions) -> Vec<(i32, String)> {
	select(move |s| s.data.object_types.iter()
		.filter(|(_, o)| matches_search(&o.name, &options))
		.map(|(id, o)| (*id, o.name.clone())).collect()
	).await
}

pub fn select_layouts() -> impl Fn(&State) -> Vec<String> {
	move |s| s.data.layouts.iter().map(|l| l.name.clone()).collect()
}
pub fn select_layout(name: String) -> impl Fn(&State) -> Option<&EdLayout> {
	move |s| s.data.layouts.iter().find(|l| l.name == name)
}
pub fn select_layout_mut(name: String) -> impl Fn(&mut State) -> Option<&mut EdLayout> {
	move |s| s.data.layouts.iter_mut().find(|l| l.name == name)
}

pub fn select_layout_layers(layout_name: String) -> impl Fn(&State) -> Vec<i32> {
	move |s| {
		for layout in &s.data.layouts {
			if layout.name == layout_name {
				return layout.layers.iter().map(|l| l.id).collect();
			}
		}
		return Vec::new();
	}
}
pub fn select_layout_layer(layer_id: i32) -> impl Fn(&State) -> Option<&EdLayoutLayer> {
	move |s| {
		for layout in &s.data.layouts {
			for layer in &layout.layers {
				if layer.id == layer_id {
					return Some(layer)
				}
			}
		}
		None
	}
}
pub fn select_layout_layer_mut(layer_id: i32) -> impl Fn(&mut State) -> Option<&mut EdLayoutLayer> {
	move |s| {
		for layout in &mut s.data.layouts {
			for layer in &mut layout.layers {
				if layer.id == layer_id {
					return Some(layer)
				}
			}
		}
		None
	}
}
pub async fn search_layout_layers(options: SearchOptions) -> Vec<(i32, String)> {
	select(move |s| s.data.layouts.iter().flat_map(|l| l.layers.iter())
		.filter(|(o)| matches_search(&o.name, &options))
		.map(|(o)| (o.id, o.name.clone())).collect()
	).await
}

pub fn select_root_animations() -> impl Fn(&State) -> Vec<i32> {
	move |s| s.data.animations.iter().map(|a| a.id).collect()
}
pub fn select_animation_children(animation_id: i32) -> impl Fn(&State) -> Vec<i32> {
	move |s| {
		let Some(animation) = select_animation(animation_id)(s) else { return Vec::new(); };
		animation.sub_animations.iter().map(|a| a.id).collect()
	}
}
pub fn select_animation(animation_id: i32) -> impl Fn(&State) -> Option<&Animation> {
	move |s| {
		fn search<'a>(animations: &'a Vec<Animation>, id: i32) -> Option<&'a Animation> {
			for a in animations {
				if a.id == id { return Some(a) }
				if let Some(child) = search(&a.sub_animations, id) { return Some(child) }
			}
			None
		}
		search(&s.data.animations, animation_id)
	}
}
pub fn select_animation_mut(animation_id: i32) -> impl Fn(&mut State) -> Option<&mut Animation> {
	move |s| {
		fn search<'a>(animations: &'a mut Vec<Animation>, id: i32) -> Option<&'a mut Animation> {
			for a in animations {
				if a.id == id { return Some(a) }
				if let Some(child) = search(&mut a.sub_animations, id) { return Some(child) }
			}
			None
		}
		search(&mut s.data.animations, animation_id)
	}
}
pub fn select_animation_image_id(animation_id: i32) -> impl Fn(&State) -> Option<i32> {
	move |s| {
		let animation = select_animation(animation_id)(s)?;
		let frame = animation.frames.get(0)?;
		Some(frame.image_id)
	}
}

pub fn select_behaviors() -> impl Fn(&State) -> Vec<(i32, i32)> {
	move |s| s.data.behaviors.iter().map(|b| (b.object_type_id, b.mov_index)).collect()
}
pub fn select_behavior(object_type_id: i32, mov_index: i32) -> impl Fn(&State) -> Option<&Behavior> {
	move |s| s.data.behaviors.iter().find(|b| b.object_type_id == object_type_id && b.mov_index == mov_index)
}
pub fn select_behavior_mut(object_type_id: i32, mov_index: i32) -> impl Fn(&mut State) -> Option<&mut Behavior> {
	move |s| s.data.behaviors.iter_mut().find(|b| b.object_type_id == object_type_id && b.mov_index == mov_index)
}

pub fn select_containers() -> impl Fn(&State) -> Vec<i32> {
	move |s| s.data.containers.iter().map(|(k, _)| *k).collect()
}
pub fn select_container(object_id: i32) -> impl Fn(&State) -> Option<&EdContainer> {
	move |s| s.data.containers.get(&object_id)
}
pub fn search_containers(options: SearchOptions) -> impl Fn(&State) -> Vec<(i32, String)> {
	move |s| s.data.containers.iter()
		.filter_map(|(_, c)|
			if let Some(o) = s.data.object_types.get(&c.id) {
				if matches_search(&o.name, &options) { Some((o.id, o.name.clone())) } else { None }
			} else { None }
		).collect()
}

pub fn select_families() -> impl Fn(&State) -> Vec<&String> {
	move |s| s.data.families.iter().map(|f| &f.name).collect()
}
pub fn select_family(name: String) -> impl Fn(&State) -> Option<&EdFamily> {
	move |s| s.data.families.iter().find(|f| f.name == name)
}
pub fn select_family_mut(name: String) -> impl Fn(&mut State) -> Option<&mut EdFamily> {
	move |s| s.data.families.iter_mut().find(|f| f.name == name)
}

pub fn select_traits() -> impl Fn(&State) -> Vec<&String> {
	move |s| s.data.traits.iter().map(|f| &f.name).collect()
}
pub fn select_trait(name: String) -> impl Fn(&State) -> Option<&ObjectTrait> {
	move |s| s.data.traits.iter().find(|f| f.name == name)
}
pub fn select_trait_mut(name: String) -> impl Fn(&mut State) -> Option<&mut ObjectTrait> {
	move |s| s.data.traits.iter_mut().find(|f| f.name == name)
}
