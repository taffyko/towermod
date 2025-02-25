//! APIs for requesting data from the state

use std::collections::HashMap;

use crate::{app::state::{app_state::State, data_state::JsCstcData, select}, cstc_editing::EdObjectInstance};
use towermod_cstc::{plugin::PluginData, ImageMetadata, ObjectType};


pub fn select_editor_plugin(plugin_id: i32) -> impl Fn(&State) -> Option<&PluginData> {
	move |s| { s.data.editor_plugins.get(&plugin_id) }
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


pub async fn get_data() -> Option<JsCstcData> {
	if !is_data_loaded().await { return None }
	Some(select(|s| { JsCstcData::get(&s.data) }).await)
}
