///! Stable construct Classic data types transformed to be more suitable for editing
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use serde_alias::serde_alias;
use anyhow::{Result, Context};
use towermod_cstc as cstc;

#[serde_alias(SnakeCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
/// ObjectInstance with decoded data
pub struct EdObjectInstance {
	pub id: i32,
	pub object_type_id: i32,
	pub x: i32,
	pub y: i32,
	pub width: i32,
	pub height: i32,
	pub angle: f32,
	pub filter: i32,
	pub private_variables: Vec<String>,
	pub data: cstc::ObjectData,
	pub key: i32,
}
impl EdObjectInstance {
	fn from_stable(obj: cstc::ObjectInstance, object_types: &HashMap<i32, &cstc::ObjectType>, plugins: &HashMap<i32, cstc::plugin::PluginData>) -> Result<Self> {
		let obj_type = object_types.get(&obj.object_type_id).context("Object type not found")?;
		let plugin_name = &plugins.get(&obj_type.plugin_id).context("Plugin not found")?.string_table.name;
		let data = cstc::ObjectData::decode(obj.data, &plugin_name);
		let obj = EdObjectInstance { id: obj.id, object_type_id: obj.object_type_id, x: obj.x, y: obj.y, width: obj.width, height: obj.height, angle: obj.angle, filter: obj.filter, private_variables: obj.private_variables, data, key: obj.key };
		Ok(obj)
	}
	fn to_stable(obj: EdObjectInstance) -> cstc::ObjectInstance {
		let data = obj.data.encode();
		cstc::ObjectInstance { id: obj.id, object_type_id: obj.object_type_id, x: obj.x, y: obj.y, width: obj.width, height: obj.height, angle: obj.angle, filter: obj.filter, private_variables: obj.private_variables, data, key: obj.key }
	}
}


#[serde_alias(SnakeCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EdLayout {
	/// Unique name.
	pub name: String,
	pub width: i32,
	pub height: i32,
	pub color: i32,
	pub unbounded_scrolling: bool,
	pub application_background: bool,
	pub data_keys: Vec<cstc::DataKey>,
	pub layers: Vec<EdLayoutLayer>,
	pub image_ids: Vec<i32>,
	pub texture_loading_mode: cstc::TextureLoadingMode,
}
impl EdLayout {
	fn from_stable(layout: cstc::Layout, object_types: &HashMap<i32, &cstc::ObjectType>, plugins: &HashMap<i32, cstc::plugin::PluginData>) -> Result<Self> {
		let cstc::Layout { name, width, height, color, unbounded_scrolling, application_background, data_keys, layers, image_ids, texture_loading_mode } = layout;
		let layers = layers.into_iter()
			.map(|layer| EdLayoutLayer::from_stable(layer, object_types, plugins))
			.collect::<Result<Vec<_>>>()?;
		Ok(EdLayout { name, width, height, color, unbounded_scrolling, application_background, data_keys, layers, image_ids, texture_loading_mode })
	}
	fn to_stable(self) -> cstc::Layout {
		let EdLayout { name, width, height, color, unbounded_scrolling, application_background, data_keys, layers, image_ids, texture_loading_mode } = self;
		let layers = layers.into_iter().map(|layer| layer.to_stable()).collect();
		cstc::Layout { name, width, height, color, unbounded_scrolling, application_background, data_keys, layers, image_ids, texture_loading_mode }
	}
}

#[serde_alias(SnakeCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EdLayoutLayer {
	pub id: i32,
	pub name: String,
	pub layer_type: cstc::LayerType,
	pub filter_color: i32,
	pub opacity: f32,
	pub angle: f32,
	pub scroll_x_factor: f32,
	pub scroll_y_factor: f32,
	pub scroll_x: f32,
	pub scroll_y: f32,
	pub zoom_x_factor: f32,
	pub zoom_y_factor: f32,
	pub zoom_x: f32,
	pub zoom_y: f32,
	pub clear_background_color: bool,
	pub background_color: i32,
	pub force_own_texture: bool,
	pub sampler: cstc::LayerSamplerMode,
	#[serde(alias = "enable_3d")]
	pub enable_3d: bool,
	pub clear_depth_buffer: bool,
	pub objects: Vec<EdObjectInstance>,
}
impl EdLayoutLayer {
	fn from_stable(layer: cstc::LayoutLayer, object_types: &HashMap<i32, &cstc::ObjectType>, plugins: &HashMap<i32, cstc::plugin::PluginData>) -> Result<Self> {
		let cstc::LayoutLayer { id, name, layer_type, filter_color, opacity, angle, scroll_x_factor, scroll_y_factor, scroll_x, scroll_y, zoom_x_factor, zoom_y_factor, zoom_x, zoom_y, clear_background_color, background_color, force_own_texture, sampler, enable_3d, clear_depth_buffer, objects } = layer;
		let objects = objects.into_iter()
			.map(|obj| EdObjectInstance::from_stable(obj, object_types, plugins))
			.collect::<Result<Vec<_>>>()?;
		Ok(EdLayoutLayer { id, name, layer_type, filter_color, opacity, angle, scroll_x_factor, scroll_y_factor, scroll_x, scroll_y, zoom_x_factor, zoom_y_factor, zoom_x, zoom_y, clear_background_color, background_color, force_own_texture, sampler, enable_3d, clear_depth_buffer, objects })
	}
	fn to_stable(self) -> cstc::LayoutLayer {
		let EdLayoutLayer { id, name, layer_type, filter_color, opacity, angle, scroll_x_factor, scroll_y_factor, scroll_x, scroll_y, zoom_x_factor, zoom_y_factor, zoom_x, zoom_y, clear_background_color, background_color, force_own_texture, sampler, enable_3d, clear_depth_buffer, objects } = self;
		let objects = objects.into_iter().map(EdObjectInstance::to_stable).collect();
		cstc::LayoutLayer { id, name, layer_type, filter_color, opacity, angle, scroll_x_factor, scroll_y_factor, scroll_x, scroll_y, zoom_x_factor, zoom_y_factor, zoom_x, zoom_y, clear_background_color, background_color, force_own_texture, sampler, enable_3d, clear_depth_buffer, objects }
	}
}


#[serde_alias(SnakeCase, CamelCase)]
#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CstcData {
	pub editor_plugins: HashMap<i32, cstc::plugin::PluginData>,
	pub object_types: Vec<cstc::ObjectType>,
	pub behaviors: Vec<cstc::Behavior>,
	pub traits: Vec<cstc::ObjectTrait>,
	pub families: Vec<cstc::Family>,
	pub layouts: Vec<EdLayout>,
	pub containers: Vec<cstc::Container>,
	pub animations: Vec<cstc::Animation>,
	pub app_block: Option<cstc::AppBlock>,
	pub event_block: Option<cstc::EventBlock>,
	pub image_block: Vec<cstc::ImageMetadata>,
}


pub type StableData = (HashMap<i32, cstc::plugin::PluginData>, cstc::AppBlock, Vec<cstc::ImageMetadata>, cstc::LevelBlock, cstc::EventBlock);

impl CstcData {
	pub fn from_stable(value: StableData) -> Result<Self> {
		let (editor_plugins, app_block, image_block, level_block, event_block) = value;
		let cstc::LevelBlock { object_types, behaviors, traits, families, containers, layouts, animations } = level_block;
		let object_types_map = object_types.iter().map(|obj_type| (obj_type.id, obj_type)).collect();
		let layouts = layouts.into_iter()
			.map(|layout| EdLayout::from_stable(layout, &object_types_map, &editor_plugins))
			.collect::<Result<Vec<_>>>()?;
		Ok(CstcData { editor_plugins, object_types, behaviors, traits, families, containers, layouts, animations, app_block: Some(app_block), event_block: Some(event_block), image_block })
	}

	pub fn to_stable(self) -> StableData {
		let CstcData { editor_plugins, object_types, behaviors, traits, families, containers, layouts, animations, app_block, event_block, image_block } = self;
		let layouts = layouts.into_iter().map(|layout| layout.to_stable()).collect();
		let level_block = cstc::LevelBlock { object_types, behaviors, traits, families, containers, layouts, animations };
		(editor_plugins, app_block.unwrap(), image_block, level_block, event_block.unwrap())
	}
}
