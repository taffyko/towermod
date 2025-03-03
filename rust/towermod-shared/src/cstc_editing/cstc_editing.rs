///! Stable construct Classic data types transformed to be more suitable for editing
use std::collections::HashMap;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_alias::serde_alias;
use anyhow::{Result, Context};
use towermod_cstc as cstc;

#[serde_alias(SnakeCase)]
#[derive(Default, Debug, Clone, Serialize, Deserialize)]
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
	pub private_variables: HashMap<String, VariableValue>,
	pub data: cstc::ObjectData,
	pub key: i32,
}
impl EdObjectInstance {
	fn from_stable(obj: cstc::ObjectInstance, object_types: &IndexMap<i32, &EdObjectType>, plugins: &HashMap<i32, cstc::plugin::PluginData>) -> Result<Self> {
		let obj_type = object_types.get(&obj.object_type_id).context("Object type not found")?;
		let plugin_name = &plugins.get(&obj_type.plugin_id).context("Plugin not found")?.string_table.name;
		let data = cstc::ObjectData::decode(obj.data, &plugin_name);
		let private_variables = std::iter::zip(obj_type.private_variables.clone(), obj.private_variables).map(|((name, value_type), value)| Ok((name, match value_type {
			VariableType::Number => VariableValue::Number(value.parse().unwrap_or(0.0)),
			VariableType::String => VariableValue::String(value),
		}))).collect::<Result<HashMap<_, _>>>()?;

		let obj = EdObjectInstance { id: obj.id, object_type_id: obj.object_type_id, x: obj.x, y: obj.y, width: obj.width, height: obj.height, angle: obj.angle, filter: obj.filter, private_variables: private_variables, data, key: obj.key };
		Ok(obj)
	}
	fn to_stable(mut self, object_types: &IndexMap<i32, &EdObjectType>) -> Result<cstc::ObjectInstance> {
		let data = self.data.encode();
		let obj_type = object_types.get(&self.object_type_id).context("Object type not found")?;
		let private_variables = obj_type.private_variables.iter().map(|(name, _)| {
			match self.private_variables.remove(name).context("Variable missing from object")? {
				VariableValue::Number(num) => Ok(num.to_string()),
				VariableValue::String(string) => Ok(string),
			}
		}).collect::<Result<Vec<_>>>()?;
		Ok(cstc::ObjectInstance { id: self.id, object_type_id: self.object_type_id, x: self.x, y: self.y, width: self.width, height: self.height, angle: self.angle, filter: self.filter, private_variables, data, key: self.key })
	}
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EdObjectType {
	pub id: i32,
	pub name: String,
	pub plugin_id: i32,
	pub global: bool,
	pub destroy_when: towermod_cstc::DisableShaderWhen,
	pub private_variables: IndexMap<String, VariableType>,
	pub descriptors: Option<towermod_cstc::FeatureDescriptors>,
}
impl EdObjectType {
	fn from_stable(obj_type: cstc::ObjectType) -> Result<Self> {
		let cstc::ObjectType { id, name, plugin_id, global, destroy_when, private_variables, descriptors } = obj_type;
		let private_variables = private_variables.into_iter().map(|var| (match var.value_type {
			cstc::PrivateVariableType::Integer => (var.name, VariableType::Number),
			cstc::PrivateVariableType::String => (var.name, VariableType::String),
		})).collect();
		Ok(EdObjectType { id, name, plugin_id, global, destroy_when, private_variables, descriptors })
	}
	fn to_stable(self) -> cstc::ObjectType {
		let EdObjectType { id, name, plugin_id, global, destroy_when, private_variables, descriptors } = self;
		let private_variables = private_variables.into_iter().map(|(name, value_type)| cstc::PrivateVariable { name, value_type: match value_type {
			VariableType::Number => cstc::PrivateVariableType::Integer,
			VariableType::String => cstc::PrivateVariableType::String,
		}}).collect();
		cstc::ObjectType { id, name, plugin_id, global, destroy_when, private_variables, descriptors }
	}
}

#[serde_alias(SnakeCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EdAppBlock {
	pub name: String,
	pub window_width: i32,
	pub window_height: i32,
	pub eye_distance: f32,
	pub show_menu: bool,
	pub screensaver: bool,
	pub fps_mode: cstc::FpsMode,
	pub fps: i32,
	pub fullscreen: bool,
	pub sampler_mode: cstc::SamplerMode,
	pub global_variables: Vec<cstc::GlobalVariable>,
	pub behavior_controls: Vec<cstc::BehaviorControl>,
	pub disable_windows_key: bool,
	pub data_keys: IndexMap<String, VariableValue>,
	pub simulate_shaders: cstc::SimulateShadersMode,
	pub original_project_path: String,
	pub fps_in_caption: i32,
	pub use_motion_blur: bool,
	pub motion_blur_steps: i32,
	pub text_rendering_mode: cstc::TextRenderingMode,
	pub override_timedelta: bool,
	pub time_delta_override: f32,
	pub caption: bool,
	pub minimize_box: bool,
	pub maximize_box: bool,
	pub resize_mode: cstc::ResizeMode,
	pub minimum_fps: f32,
	pub layout_index: i32,
	pub multisamples: u32,
	pub texture_loading_mode: cstc::TextureLoadingMode,
}
impl EdAppBlock {
	fn from_stable(app_block: cstc::AppBlock) -> Self {
		let cstc::AppBlock { name, window_width, window_height, eye_distance, show_menu, screensaver, fps_mode, fps, fullscreen, sampler_mode, global_variables, behavior_controls, disable_windows_key, data_keys, simulate_shaders, original_project_path, fps_in_caption, use_motion_blur, motion_blur_steps, text_rendering_mode, override_timedelta, time_delta_override, caption, minimize_box, maximize_box, resize_mode, minimum_fps, layout_index, multisamples, texture_loading_mode } = app_block;
		let data_keys = data_keys.into_iter().map(|value| match value {
			cstc::DataKey::Pointer(name, ptr) => (name, VariableValue::Number(ptr as f64)),
			cstc::DataKey::String(name, string) => (name, VariableValue::String(string)),
		}).collect();
		EdAppBlock { name, window_width, window_height, eye_distance, show_menu, screensaver, fps_mode, fps, fullscreen, sampler_mode, global_variables, behavior_controls, disable_windows_key, data_keys, simulate_shaders, original_project_path, fps_in_caption, use_motion_blur, motion_blur_steps, text_rendering_mode, override_timedelta, time_delta_override, caption, minimize_box, maximize_box, resize_mode, minimum_fps, layout_index, multisamples, texture_loading_mode }
	}
	fn to_stable(self) -> cstc::AppBlock {
		let EdAppBlock { name, window_width, window_height, eye_distance, show_menu, screensaver, fps_mode, fps, fullscreen, sampler_mode, global_variables, behavior_controls, disable_windows_key, data_keys, simulate_shaders, original_project_path, fps_in_caption, use_motion_blur, motion_blur_steps, text_rendering_mode, override_timedelta, time_delta_override, caption, minimize_box, maximize_box, resize_mode, minimum_fps, layout_index, multisamples, texture_loading_mode } = self;
		let data_keys = data_keys.into_iter().map(|(name, value)| match value {
			VariableValue::Number(ptr) => cstc::DataKey::Pointer(name, ptr as u32),
			VariableValue::String(string) => cstc::DataKey::String(name, string),
		}).collect();
		cstc::AppBlock { name, window_width, window_height, eye_distance, show_menu, screensaver, fps_mode, fps, fullscreen, sampler_mode, global_variables, behavior_controls, disable_windows_key, data_keys, simulate_shaders, original_project_path, fps_in_caption, use_motion_blur, motion_blur_steps, text_rendering_mode, override_timedelta, time_delta_override, caption, minimize_box, maximize_box, resize_mode, minimum_fps, layout_index, multisamples, texture_loading_mode }
	}
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EdFamily {
	// Unique name.
	pub name: String,
	pub object_type_ids: Vec<i32>,
	pub private_variables: HashMap<String, VariableType>,
}
impl EdFamily {
	fn from_stable(family: cstc::Family) -> Self {
		let cstc::Family { name, object_type_ids, private_variables } = family;
		let private_variables = private_variables.into_iter().map(|var| (var.name, match var.value_type {
			cstc::PrivateVariableType::Integer => VariableType::Number,
			cstc::PrivateVariableType::String => VariableType::String,
		})).collect();
		EdFamily { name, object_type_ids, private_variables }
	}
	fn to_stable(self) -> cstc::Family {
		let EdFamily { name, object_type_ids, private_variables } = self;
		let private_variables = private_variables.into_iter().map(|(name, value_type)| cstc::PrivateVariable { name, value_type: match value_type {
			VariableType::Number => cstc::PrivateVariableType::Integer,
			VariableType::String => cstc::PrivateVariableType::String,
		}}).collect();
		cstc::Family { name, object_type_ids, private_variables }
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
	pub data_keys: IndexMap<String, VariableValue>,
	pub layers: Vec<EdLayoutLayer>,
	pub image_ids: Vec<i32>,
	pub texture_loading_mode: cstc::TextureLoadingMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum EdDataKey {
	Pointer(u32),
	String(String),
}

impl EdLayout {
	fn from_stable(layout: cstc::Layout, object_types: &IndexMap<i32, &EdObjectType>, plugins: &HashMap<i32, cstc::plugin::PluginData>) -> Result<Self> {
		let cstc::Layout { name, width, height, color, unbounded_scrolling, application_background, data_keys, layers, image_ids, texture_loading_mode } = layout;
		let layers = layers.into_iter()
			.map(|layer| EdLayoutLayer::from_stable(layer, object_types, plugins))
			.collect::<Result<Vec<_>>>()?;
		let data_keys = data_keys.into_iter().map(|value| match value {
			cstc::DataKey::Pointer(name, ptr) => (name, VariableValue::Number(ptr as f64)),
			cstc::DataKey::String(name, string) => (name, VariableValue::String(string)),
		}).collect();
		Ok(EdLayout { name, width, height, color, unbounded_scrolling, application_background, data_keys, layers, image_ids, texture_loading_mode })
	}
	fn to_stable(self, object_types: &IndexMap<i32, &EdObjectType>) -> Result<cstc::Layout> {
		let EdLayout { name, width, height, color, unbounded_scrolling, application_background, data_keys, layers, image_ids, texture_loading_mode } = self;
		let layers = layers.into_iter().map(|layer| layer.to_stable(object_types)).collect::<Result<Vec<_>>>()?;
		let data_keys = data_keys.into_iter().map(|(name, value)| match value {
			VariableValue::Number(ptr) => cstc::DataKey::Pointer(name, ptr as u32),
			VariableValue::String(string) => cstc::DataKey::String(name, string),
		}).collect();
		Ok(cstc::Layout { name, width, height, color, unbounded_scrolling, application_background, data_keys, layers, image_ids, texture_loading_mode })
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
	#[serde(default)]
	pub objects: Vec<EdObjectInstance>,
}
impl EdLayoutLayer {
	fn from_stable(layer: cstc::LayoutLayer, object_types: &IndexMap<i32, &EdObjectType>, plugins: &HashMap<i32, cstc::plugin::PluginData>) -> Result<Self> {
		let cstc::LayoutLayer { id, name, layer_type, filter_color, opacity, angle, scroll_x_factor, scroll_y_factor, scroll_x, scroll_y, zoom_x_factor, zoom_y_factor, zoom_x, zoom_y, clear_background_color, background_color, force_own_texture, sampler, enable_3d, clear_depth_buffer, objects } = layer;
		let objects = objects.into_iter()
			.map(|obj| EdObjectInstance::from_stable(obj, object_types, plugins))
			.collect::<Result<Vec<_>>>()?;
		Ok(EdLayoutLayer { id, name, layer_type, filter_color, opacity, angle, scroll_x_factor, scroll_y_factor, scroll_x, scroll_y, zoom_x_factor, zoom_y_factor, zoom_x, zoom_y, clear_background_color, background_color, force_own_texture, sampler, enable_3d, clear_depth_buffer, objects })
	}
	fn to_stable(self, object_types: &IndexMap<i32, &EdObjectType>) -> Result<cstc::LayoutLayer> {
		let EdLayoutLayer { id, name, layer_type, filter_color, opacity, angle, scroll_x_factor, scroll_y_factor, scroll_x, scroll_y, zoom_x_factor, zoom_y_factor, zoom_x, zoom_y, clear_background_color, background_color, force_own_texture, sampler, enable_3d, clear_depth_buffer, objects } = self;
		let objects = objects.into_iter().map(|obj| obj.to_stable(object_types)).collect::<Result<Vec<_>>>()?;
		Ok(cstc::LayoutLayer { id, name, layer_type, filter_color, opacity, angle, scroll_x_factor, scroll_y_factor, scroll_x, scroll_y, zoom_x_factor, zoom_y_factor, zoom_x, zoom_y, clear_background_color, background_color, force_own_texture, sampler, enable_3d, clear_depth_buffer, objects })
	}
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum VariableValue {
	Number(f64),
	String(String),
}
#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
pub enum VariableType {
	Number,
	String
}
impl From<&VariableValue> for VariableType {
	fn from(value: &VariableValue) -> Self {
		match value {
			VariableValue::Number(_) => VariableType::Number,
			VariableValue::String(_) => VariableType::String,
		}
	}
}
impl From<VariableType> for VariableValue {
	fn from(value: VariableType) -> Self {
		match value {
			VariableType::Number => VariableValue::Number(0.0),
			VariableType::String => VariableValue::String(String::new()),
		}
	}
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CstcData {
	pub editor_plugins: HashMap<i32, cstc::plugin::PluginData>,
	pub object_types: Vec<EdObjectType>,
	pub behaviors: Vec<cstc::Behavior>,
	pub traits: Vec<cstc::ObjectTrait>,
	pub families: Vec<EdFamily>,
	pub layouts: Vec<EdLayout>,
	pub containers: Vec<cstc::Container>,
	pub animations: Vec<cstc::Animation>,
	pub app_block: Option<EdAppBlock>,
	pub event_block: Option<cstc::EventBlock>,
	pub image_block: Vec<cstc::ImageMetadata>,
}

pub type StableData = (HashMap<i32, cstc::plugin::PluginData>, cstc::AppBlock, Vec<cstc::ImageMetadata>, cstc::LevelBlock, cstc::EventBlock);

impl CstcData {
	pub fn from_stable(value: StableData) -> Result<Self> {
		let (editor_plugins, app_block, image_block, level_block, event_block) = value;
		let cstc::LevelBlock { object_types, behaviors, traits, families, containers, layouts, animations } = level_block;
		let object_types = object_types.into_iter().map(|obj_type| EdObjectType::from_stable(obj_type)).collect::<Result<Vec<_>>>()?;
		let object_types_map = object_types.iter().map(|obj_type| (obj_type.id, obj_type)).collect();
		let app_block = EdAppBlock::from_stable(app_block);
		let families = families.into_iter().map(EdFamily::from_stable).collect();
		let layouts = layouts.into_iter()
			.map(|layout| EdLayout::from_stable(layout, &object_types_map, &editor_plugins))
			.collect::<Result<Vec<_>>>()?;
		Ok(CstcData { editor_plugins, object_types, behaviors, traits, families, containers, layouts, animations, app_block: Some(app_block), event_block: Some(event_block), image_block })
	}

	pub fn to_stable(self) -> Result<StableData> {
		let CstcData { editor_plugins, object_types, behaviors, traits, families, containers, layouts, animations, app_block, event_block, image_block } = self;
		let object_types_map = object_types.iter().map(|obj_type| (obj_type.id, obj_type)).collect();
		let families = families.into_iter().map(EdFamily::to_stable).collect();
		let layouts = layouts.into_iter().map(|layout| layout.to_stable(&object_types_map)).collect::<Result<Vec<_>>>()?;
		let object_types = object_types.into_iter().map(EdObjectType::to_stable).collect();
		let level_block = cstc::LevelBlock { object_types, behaviors, traits, families, containers, layouts, animations };
		let app_block = app_block.unwrap().to_stable();
		Ok((editor_plugins, app_block, image_block, level_block, event_block.unwrap()))
	}
}
