use num_traits::{FromPrimitive};
use anyhow::Result;

use crate::Nt;

use super::{block::{BlockReader, BlockWriter}, stable::*};

pub fn deserialize_levelblock(buffer: &[u8]) -> Result<LevelBlock> {
	let mut reader = BlockReader::new(buffer);
	Ok(reader.read_levelblock())
}

pub fn serialize_levelblock(data: &LevelBlock) -> Result<Vec<u8>> {
	let mut writer = BlockWriter::new();
	writer.write_levelblock(data);
	Ok(writer.buffer)
}

impl BlockReader<'_> {

	fn read_levelblock(&mut self) -> LevelBlock {
		let object_types = self.read_collection(Self::read_object_type);

		let behaviors = self.read_collection(Self::read_behavior);

		let traits = self.read_collection(Self::read_trait);

		let families = self.read_collection(Self::read_family);

		let containers = self.read_collection(Self::read_container);

		let layouts = self.read_collection(Self::read_layout);

		let animations = self.read_collection(Self::read_animation);

		LevelBlock { object_types, behaviors, traits, families, containers, layouts, animations }
	}

	fn read_object_type(&mut self) -> ObjectType {
		let object_id = self.read_i32();
		let object_name = self.read_string();
		let plugin_id = self.read_i32();
		let global = self.read_u8() == 1;
		let destroy_when = DisableShaderWhen::from_i32(self.read_i32()).unwrap();
		let private_variables = self.read_collection(Self::read_private_variable);
		assert_eq!(self.read_i32(), 0);
		assert_eq!(self.read_i32(), 0);
		assert_eq!(self.read_i32(), 0);
		assert_eq!(self.read_i32(), 0);
		let descriptors = self.read_feature_descriptors();

		ObjectType { id: object_id, name: object_name, plugin_id, global, destroy_when, private_variables, descriptors }
	}

	fn read_feature_descriptors(&mut self) -> Option<FeatureDescriptors> {
		let dll_not_added = self.read_u8() == 1;
		let descriptors = match dll_not_added {
			false => None,
			true => Some(FeatureDescriptors {
				actions: self.read_feature_descriptor_group(),
				conditions: self.read_feature_descriptor_group(),
				expressions: self.read_feature_descriptor_group(),
			}),
		};
		descriptors
	}

	fn read_feature_descriptor_group(&mut self) -> Vec<FeatureDescriptor> {
		self.read_collection(|this| {
			let script_name = this.read_string();
			let param_count = this.read_u32();
			FeatureDescriptor { script_name, param_count }
		})
	}

	fn read_behavior(&mut self) -> Behavior {
		let object_id = self.read_i32();
		let new_index = self.read_i32();
		let mov_index = self.read_i32();
		let name = self.read_string();
		let data_len = self.read_i32();
		let data = self.read_bytes(data_len as usize);
		let descriptors = self.read_feature_descriptors();
		Behavior { object_type_id: object_id, new_index, mov_index, name, data, descriptors }
	}

	fn read_private_variable(&mut self) -> PrivateVariable {
		let name = self.read_string();
		let value_type = PrivateVariableType::from_i32(self.read_i32()).unwrap();
		PrivateVariable { name, value_type }
	}

	fn read_trait(&mut self) -> ObjectTrait {
		let name = self.read_string();
		let object_ids = self.read_collection(|this| this.read_i32());
		ObjectTrait { name, object_type_ids: object_ids }
	}

	fn read_family(&mut self) -> Family {
		let name = self.read_string();
		let object_type_ids = self.read_collection(|this| this.read_i32());
		let private_variables = self.read_collection(Self::read_private_variable);
		Family { name, object_type_ids, private_variables }
	}

	fn read_container(&mut self) -> Container {
		let object_type_ids = self.read_collection(|this| this.read_i32());
		Container { object_ids: object_type_ids }
	}

	fn read_layout(&mut self) -> Layout {
		let width = self.read_i32();
		let height = self.read_i32();
		let name = self.read_string();
		let color = self.read_i32();
		let unbounded_scrolling = self.read_u8() == 1;
		let application_background = self.read_u8() == 1;
		let data_keys = self.read_collection(Self::read_data_key);
		let layers = self.read_collection(Self::read_layout_layer);
		let image_ids = self.read_collection(|this| this.read_i32());
		let texture_loading_mode = TextureLoadingMode::from_i32(self.read_i32()).unwrap();

		Layout { width, height, name, color, unbounded_scrolling, application_background, data_keys, layers, image_ids, texture_loading_mode }
	}

	fn read_layout_layer(&mut self) -> LayoutLayer {
		let layer_id = self.read_i32();
		let name = self.read_string();
		let layer_type = LayerType::from_u8(self.read_u8()).unwrap();
		let filter_color = self.read_i32();
		let opacity = Nt(self.read_f32());
		let angle = Nt(self.read_f32());
		let scroll_x_factor = Nt(self.read_f32());
		let scroll_y_factor = Nt(self.read_f32());
		let scroll_x = Nt(self.read_f32());
		let scroll_y = Nt(self.read_f32());

		let zoom_x_factor = Nt(self.read_f32());
		let zoom_y_factor = Nt(self.read_f32());
		let zoom_x = Nt(self.read_f32());
		let zoom_y = Nt(self.read_f32());
		
		let clear_background_color = self.read_u8() == 1;
		let background_color = self.read_i32();
		let force_own_texture = self.read_u8() == 1;
		let sampler = LayerSamplerMode::from_i32(self.read_i32()).unwrap();
		let enable_3d = self.read_u8() == 1;
		let clear_depth_buffer = self.read_u8() == 1;

		let objects = self.read_collection(Self::read_layout_object);
		
		LayoutLayer { id: layer_id, name, layer_type, filter_color, opacity, angle, scroll_x_factor, scroll_y_factor, scroll_x, scroll_y, zoom_x_factor, zoom_y_factor, zoom_x, zoom_y, clear_background_color, background_color, force_own_texture, sampler, enable_3d, clear_depth_buffer, objects }
	}

	fn read_layout_object(&mut self) -> ObjectInstance {
		let key = self.read_i32();
		let x = self.read_i32();
		let y = self.read_i32();
		let width = self.read_i32();
		let height = self.read_i32();
		let angle = Nt(self.read_f32());
		let filter = self.read_i32();

		let object_type_id = self.read_i32();
		let instance_id = self.read_i32();
		assert_eq!(object_type_id, self.read_i32());

		let private_variables = self.read_collection(|this| this.read_string());

		let data_size = self.read_u32() as usize;
		let data = self.read_bytes(data_size);

		ObjectInstance { key, x, y, width, height, angle, filter, object_type_id, id: instance_id, private_variables, data }
	}
}

impl BlockWriter {
	fn write_levelblock(&mut self, data: &LevelBlock) {
		self.write_collection(Self::write_object_type, &data.object_types);
		self.write_collection(Self::write_behavior, &data.behaviors);
		self.write_collection(Self::write_trait, &data.traits);
		self.write_collection(Self::write_family, &data.families);
		self.write_collection(Self::write_container, &data.containers);
		self.write_collection(Self::write_layout, &data.layouts);
		self.write_collection(Self::write_animation, &data.animations);
	}

	fn write_object_type(&mut self, o: &ObjectType) {
		self.write_i32(o.id);
		self.write_string(&o.name);
		self.write_i32(o.plugin_id);
		self.write_u8(o.global as u8);
		self.write_i32(o.destroy_when as i32);
		self.write_collection(Self::write_private_variable, &o.private_variables);
		self.write_i32(0);
		self.write_i32(0);
		self.write_i32(0);
		self.write_i32(0);
		self.write_feature_descriptors(o.descriptors.as_ref());
	}

	fn write_behavior(&mut self, b: &Behavior) {
		self.write_i32(b.object_type_id);
		self.write_i32(b.new_index);
		self.write_i32(b.mov_index);
		self.write_string(&b.name);
		self.write_i32(b.data.len() as i32);
		self.write_bytes(&b.data);
		self.write_feature_descriptors(b.descriptors.as_ref());
	}

	fn write_feature_descriptors(&mut self, descriptors: Option<&FeatureDescriptors>) {
		match descriptors {
			None => {
				self.write_u8(0);
			}
			Some(FeatureDescriptors { actions, conditions, expressions }) => {
				self.write_u8(1);
				self.write_feature_descriptor_group(actions);
				self.write_feature_descriptor_group(conditions);
				self.write_feature_descriptor_group(expressions);
			}
		};
	}

	fn write_feature_descriptor_group(&mut self, descriptors: &[FeatureDescriptor]) {
		self.write_collection(|this, d| {
			this.write_string(&d.script_name);
			this.write_u32(d.param_count);
		}, descriptors);
	}

	fn write_private_variable(&mut self, v: &PrivateVariable) {
		self.write_string(&v.name);
		self.write_i32(v.value_type as i32);
	}

	fn write_trait(&mut self, t: &ObjectTrait) {
		self.write_string(&t.name);
		self.write_collection(|this, i| this.write_i32(*i), &t.object_type_ids);
	}

	fn write_family(&mut self, f: &Family) {
		self.write_string(&f.name);
		self.write_collection(|this, i| this.write_i32(*i), &f.object_type_ids);
		self.write_collection(Self::write_private_variable, &f.private_variables);
	}

	fn write_container(&mut self, container: &Container) {
		self.write_collection(|this, i| this.write_i32(*i), &container.object_ids);
	}

	fn write_layout(&mut self, o: &Layout) {
		self.write_i32(o.width);
		self.write_i32(o.height);
		self.write_string(&o.name);
		self.write_i32(o.color);
		self.write_u8(o.unbounded_scrolling as u8);
		self.write_u8(o.application_background as u8);
		self.write_collection(Self::write_data_key, &o.data_keys);
		self.write_collection(Self::write_layout_layer, &o.layers);
		self.write_collection(|this, i| this.write_i32(*i), &o.image_ids);
		self.write_i32(o.texture_loading_mode as i32);
	}

	fn write_layout_layer(&mut self, o: &LayoutLayer) {
		self.write_i32(o.id);
		self.write_string(&o.name);
		self.write_u8(o.layer_type as u8);
		self.write_i32(o.filter_color);
		self.write_f32(o.opacity);
		self.write_f32(o.angle);
		self.write_f32(o.scroll_x_factor);
		self.write_f32(o.scroll_y_factor);
		self.write_f32(o.scroll_x);
		self.write_f32(o.scroll_y);

		self.write_f32(o.zoom_x_factor);
		self.write_f32(o.zoom_y_factor);
		self.write_f32(o.zoom_x);
		self.write_f32(o.zoom_y);
		
		self.write_u8(o.clear_background_color as u8);
		self.write_i32(o.background_color);
		self.write_u8(o.force_own_texture as u8);
		self.write_i32(o.sampler as i32);
		self.write_u8(o.enable_3d as u8);
		self.write_u8(o.clear_depth_buffer as u8);

		self.write_collection(Self::write_layout_object, &o.objects);
	}

	fn write_layout_object(&mut self, o: &ObjectInstance) {
		self.write_i32(o.key);
		self.write_i32(o.x);
		self.write_i32(o.y);
		self.write_i32(o.width);
		self.write_i32(o.height);
		self.write_f32(o.angle);
		self.write_i32(o.filter);

		self.write_i32(o.object_type_id);
		self.write_i32(o.id);
		self.write_i32(o.object_type_id);

		self.write_collection(|this, s| this.write_string(s), &o.private_variables);

		self.write_u32(o.data.len() as u32);
		self.write_bytes(&o.data);
	}

}
