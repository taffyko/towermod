use anyhow::Result;
use num_traits::{FromPrimitive};

use super::{block::{BlockReader, BlockWriter}};
use super::super::stable::*;

pub fn deserialize_appblock(buffer: &[u8]) -> Result<AppBlock> {
	let mut reader = BlockReader::new(buffer);
	Ok(reader.read_appblock())
}

pub fn serialize_appblock(data: &AppBlock) -> Result<Vec<u8>> {
	let mut writer = BlockWriter::new();
	writer.write_appblock(data);
	Ok(writer.buffer)
}

impl BlockReader<'_> {
	fn read_appblock(&mut self) -> AppBlock {
		let name = self.read_string();
		let window_width = self.read_i32();
		let window_height = self.read_i32();
		let eye_distance = self.read_f32();
		let show_menu = self.read_i32() == 1;
		let screensaver = self.read_u8() == 1;
		let fps_mode = FpsMode::from_u8(self.read_u8()).unwrap();
		let fps = self.read_i32();
		let fullscreen = self.read_u8() == 1;
		let sampler_mode = SamplerMode::from_i32(self.read_i32()).unwrap();
		let global_variables = self.read_collection(Self::read_global_variable);
		let behavior_controls = self.read_collection(Self::read_behavior_control);
		let disable_windows_key = self.read_u8() == 1;
		let data_keys = self.read_collection(Self::read_data_key);
		let simulate_shaders = SimulateShadersMode::from_i32(self.read_i32()).unwrap();
		let original_project_path = self.read_string();
		let fps_in_caption = self.read_i32();
		let use_motion_blur = self.read_u8() == 1;
		let motion_blur_steps = self.read_i32();
		let text_rendering_mode = TextRenderingMode::from_i32(self.read_i32()).unwrap();
		let override_timedelta = self.read_u8() == 1;
		let time_delta_override = self.read_f32();
		let caption = self.read_u8() == 1;
		let minimize_box = self.read_u8() == 1;
		let resize_mode = ResizeMode::from_i32(self.read_i32()).unwrap();
		let maximize_box = self.read_u8() == 1;
		let minimum_fps = self.read_f32();
		let layout_index = self.read_i32();
		let multisamples = self.read_u32();
		let texture_loading_mode = TextureLoadingMode::from_i32(self.read_i32()).unwrap();
		AppBlock { name, window_width, window_height, eye_distance, show_menu, screensaver, fps_mode, fps, fullscreen, sampler_mode, global_variables, behavior_controls, disable_windows_key, data_keys, simulate_shaders, original_project_path, fps_in_caption, use_motion_blur, motion_blur_steps, text_rendering_mode, override_timedelta, time_delta_override, caption, minimize_box, resize_mode, maximize_box, minimum_fps, layout_index, multisamples, texture_loading_mode }
	}

	fn read_global_variable(&mut self) -> GlobalVariable {
		let name = self.read_string();
		let var_type = self.read_i32();
		let value = self.read_string();
		GlobalVariable { name, var_type, value }
	}

	fn read_behavior_control(&mut self) -> BehaviorControl {
		let name = self.read_string();
		let vk = self.read_i32();
		let player = self.read_i32();
		BehaviorControl { name, vk, player }
	}
}

impl BlockWriter {
	fn write_appblock(&mut self, data: &AppBlock) {
		self.write_string(&data.name);
		self.write_i32(data.window_width);
		self.write_i32(data.window_height);
		self.write_f32(data.eye_distance);
		self.write_i32(data.show_menu as i32);
		self.write_u8(data.screensaver as u8);
		self.write_u8(data.fps_mode as u8);
		self.write_i32(data.fps);
		self.write_u8(data.fullscreen as u8);
		self.write_i32(data.sampler_mode as i32);
		self.write_collection(Self::write_global_variable, &data.global_variables);
		self.write_collection(Self::write_behavior_control, &data.behavior_controls);
		self.write_u8(data.disable_windows_key as u8);
		self.write_collection(Self::write_data_key, &data.data_keys);
		self.write_i32(data.simulate_shaders as i32);
		self.write_string(&data.original_project_path);
		self.write_i32(data.fps_in_caption);
		self.write_u8(data.use_motion_blur as u8);
		self.write_i32(data.motion_blur_steps);
		self.write_i32(data.text_rendering_mode as i32);
		self.write_u8(data.override_timedelta as u8);
		self.write_f32(data.time_delta_override);
		self.write_u8(data.caption as u8);
		self.write_u8(data.minimize_box as u8);
		self.write_i32(data.resize_mode as i32);
		self.write_u8(data.maximize_box as u8);
		self.write_f32(data.minimum_fps);
		self.write_i32(data.layout_index);
		self.write_u32(data.multisamples);
		self.write_i32(data.texture_loading_mode as i32);
	}

	fn write_global_variable(&mut self, global_variable: &GlobalVariable) {
		self.write_string(&global_variable.name);
		self.write_i32(global_variable.var_type);
		self.write_string(&global_variable.value);
	}

	fn write_behavior_control(&mut self, behavior_control: &BehaviorControl) {
		self.write_string(&behavior_control.name);
		self.write_i32(behavior_control.vk);
		self.write_i32(behavior_control.player);
	}
}

