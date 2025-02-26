//! APIs for requesting data from the state

use std::collections::HashMap;

use crate::{app::state::{app_state::State, data_state::JsCstcData, select}, cstc_editing::{EdLayout, EdLayoutLayer, EdObjectInstance}};
use towermod_cstc::{plugin::PluginData, ImageMetadata, ObjectType};


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

pub fn select_object_type(object_type_id: i32) -> impl Fn(&State) -> Option<&ObjectType> {
	move |s: &State| { s.data.object_types.iter().find(|ot| ot.id == object_type_id) }
}
pub fn select_object_type_plugin_name<'a>(object_type_id: i32) -> impl Fn(&'a State) -> Option<&'a String> {
	move |s| {
		let plugin_id = select_object_type(object_type_id)(s)?.plugin_id;
		select_editor_plugin_name(plugin_id)(s)
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
pub fn select_object_instances(layout_layer_id: i32) -> impl Fn(&State) -> Vec<i32> {
	move |s: &State| {
		for layout in &s.data.layouts {
			for layer in &layout.layers {
				if layer.id == layout_layer_id {
					return layer.objects.iter().map(|o| o.id).collect();
				}
			}
		}
		return Vec::new();
	}
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

pub fn select_new_object_type_id() -> impl Fn(&State) -> i32 {
	|s| { s.data.object_types.iter().map(|o| o.id).max().unwrap_or(0) + 1 }
}
pub async fn get_object_types() -> Vec<i32> {
	select(|s| s.data.object_types.iter().map(|ot| ot.id).collect()).await
}
pub async fn get_object_type(object_type_id: i32) -> Option<ObjectType> {
	select(move |s| s.data.object_types.iter().find(|ot| ot.id == object_type_id).cloned()).await
}
pub async fn search_object_types(txt: String) -> Vec<i32> {
	select(move |s| s.data.object_types.iter().filter(|ot| ot.name.contains(&txt)).map(|ot| ot.id).collect()).await
}
pub async fn get_data() -> Option<JsCstcData> {
	if !is_data_loaded().await { return None }
	Some(select(|s| { JsCstcData::get(&s.data) }).await)
}


pub fn select_layouts() -> impl Fn(&State) -> Vec<String> {
	move |s| s.data.layouts.iter().map(|l| l.name.clone()).collect()
}
pub fn select_layout(name: String) -> impl Fn(&State) -> Option<&EdLayout> {
	move |s| s.data.layouts.iter().find(|l| l.name == name)
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
