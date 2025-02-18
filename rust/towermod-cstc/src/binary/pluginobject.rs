#![allow(dead_code)]

use super::block::{BlockReader, BlockWriter};

#[derive(Debug, Clone, Default)]
pub struct ObjHeader {
	pub x: f32,
	pub y: f32,
	pub w: f32,
	pub h: f32,
	pub angle: f32,
	pub uid: i32,
	pub filter_deprecated: u32,
	pub global: bool,
	pub visible: i32,
	pub display_angle: f32,
	pub is_mirrored: bool,
	pub is_flipped: bool,
	pub filter: Color,
}

pub enum ObjectData {
	Text(TextObjectData),
	Sprite(SpriteObjectData),
	Unknown,
}

/// Decode structured object data based on associated plugin name
pub fn decode_object_data(data: &[u8], plugin_name: &str) -> ObjectData {
	use ObjectData as E;
	match plugin_name {
		"XAudio2" => E::Unknown,
		"Canvas" => E::Unknown,
		"Mouse & Keyboard" => E::Unknown,
		"Custom Movement" => E::Unknown,
		"Clipboard" => E::Unknown,
		"Hash table" => E::Unknown,
		"Window" => E::Unknown,
		"Input System" => E::Unknown,
		"Sprite" => E::Sprite(SpriteObjectData::from_bin(data)),
		"Tiled Background" => E::Unknown,
		"Image manipulator" => E::Unknown,
		"Platform" => E::Unknown,
		"Common Dialog" => E::Unknown,
		"Sine" => E::Unknown,
		"INI" => E::Unknown,
		"Gradient" => E::Unknown,
		"Panel" => E::Unknown,
		"Text" => E::Text(TextObjectData::from_bin(data)),
		"HTTP" => E::Unknown,
		"Array" => E::Unknown,
		"CRC32" => E::Unknown,
		"File" => E::Unknown,
		"Path" => E::Unknown,
		"Sys Info" => E::Unknown,
		"Function" => E::Unknown,
		_ => E::Unknown,
	}
}


pub const EXPTYPE_INTEGER: i32 = 0;
pub const EXPTYPE_FLOAT: i32 = 1;
pub const EXPTYPE_STRING: i32 = 2;
pub const EXPTYPE_ARRAY: i32 = 3;
#[derive(Debug, Clone)]
pub enum ExpStore {
	Integer(i64),
	Float(f64),
	String(String),
	Array(Vec<ExpStore>),
}


#[derive(Debug, Clone, Default)]
pub struct Color {
	pub a: f32,
	pub r: f32,
	pub g: f32,
	pub b: f32,
}

#[derive(Debug, Clone)]
pub struct TextObjectData {
	pub version: i32,
	pub text: String,
	pub font_face: String,
	pub px_size: i32,
	pub italics: i32,
	pub bold: i32,
	pub color: u32,
	pub opacity: f32,
	pub horiz_align: i32,
	pub vert_align: i32,
	pub hide_at_start: bool,
}
impl TextObjectData {
	pub fn from_bin(bin: &[u8]) -> Self {
		let mut bin = BlockReader::new(bin);
		bin.read_text_obj()
	}
	pub fn to_bin(&self) -> Vec<u8> {
		let mut bin = BlockWriter::new();
		bin.write_text_obj(self);
		bin.buffer
	}
}

impl BlockReader<'_> {
	pub fn read_obj_header(&mut self) -> ObjHeader {
		let x = self.read_f32();
		let y = self.read_f32();
		let w = self.read_f32();
		let h = self.read_f32();
		let angle = self.read_f32();
		let uid = self.read_i32();
		let filter_deprecated = self.read_u32();
		let global = self.read_u8() == 1;
		let visible = self.read_i32();
		let display_angle = self.read_f32();
		let is_mirrored = self.read_u8() == 1;
		let is_flipped = self.read_u8() == 1;
		let filter = self.read_color();
		ObjHeader { x, y, w, h, angle, uid, filter_deprecated, global, visible, display_angle, is_mirrored, is_flipped, filter }
	}

	pub fn read_exp_store(&mut self) -> ExpStore {
		match self.read_i32() {
			EXPTYPE_INTEGER => {
				ExpStore::Integer(self.read_i64())
			},
			EXPTYPE_FLOAT => {
				ExpStore::Float(self.read_f64())
			},
			EXPTYPE_STRING => {
				ExpStore::String(self.read_string())
			},
			EXPTYPE_ARRAY => {
				ExpStore::Array(self.read_collection(|this| {
					this.read_exp_store()
				}))
			},
			_ => panic!(),
		}
	}

	pub fn read_color(&mut self) -> Color {
		let a = self.read_f32();
		let r = self.read_f32();
		let g = self.read_f32();
		let b = self.read_f32();
		Color { a, r, g, b }
	}

	pub fn read_text_obj(&mut self) -> TextObjectData {
		let version = self.read_i32();
		assert_eq!(version, 2);
		let text = self.read_string();
		let font_face = self.read_string();
		let px_size = self.read_i32();
		let italics = self.read_i32();
		let bold = self.read_i32();
		let color = self.read_u32();
		let opacity = self.read_f32();
		let horiz_align = self.read_i32();
		let vert_align = self.read_i32();
		let hide_at_start = self.read_u8() == 1;
		TextObjectData { version, text, font_face, px_size, italics, bold, color, opacity, horiz_align, vert_align, hide_at_start }
	}

	pub fn read_text_obj_v1(&mut self) -> TextObjectData {
		let version = self.read_i32();
		assert_eq!(version, 1);
		let _info = self.read_obj_header();
		let _text = self.read_string();
		let _font_face = self.read_string();
		let _px_size = self.read_i32();
		let _bold = self.read_i32();
		let _italics = self.read_i32();
		let _dw_flags = self.read_u32();
		let _private_vars = self.read_collection(|this| {
			this.read_exp_store()
		});
		todo!();
	}
}

impl BlockWriter {
	pub fn write_text_obj(&mut self, text: &TextObjectData) {
		self.write_i32(text.version);
		self.write_string(&text.text);
		self.write_string(&text.font_face);
		self.write_i32(text.px_size);
		self.write_i32(text.italics);
		self.write_i32(text.bold);
		self.write_u32(text.color);
		self.write_f32(text.opacity);
		self.write_i32(text.horiz_align);
		self.write_i32(text.vert_align);
		self.write_u8(text.hide_at_start as u8)
	}
}

#[derive(Debug, Clone)]
pub struct SpriteObjectData {
	pub version: i32,
	pub coll_mode: i32,
	pub auto_mirror: i32,
	pub auto_flip: i32,
	pub auto_rotations: i32,
	pub auto_rotations_combo: i32,
	pub hide_at_start: bool,
	pub animation: i32,
	pub skew_x: f32,
	pub skew_y: f32,
	pub locked_animation_angles: bool,
	pub start_anim: String, // TODO validate on this in UI
	pub start_frame: i32, // TODO validate on this in UI
}
impl SpriteObjectData {
	pub fn from_bin(bin: &[u8]) -> Self {
		let mut bin = BlockReader::new(bin);
		bin.read_sprite_obj()
	}
	pub fn to_bin(&self) -> Vec<u8> {
		let mut bin = BlockWriter::new();
		bin.write_sprite_obj(self);
		bin.buffer
	}
}

impl BlockReader<'_> {

	fn read_sprite_obj(&mut self) -> SpriteObjectData {
		let version = self.read_i32();
		assert_eq!(version, 5);
		let coll_mode = self.read_i32();
		let auto_mirror = self.read_i32();
		let auto_flip = self.read_i32();
		let auto_rotations = self.read_i32();
		let auto_rotations_combo = self.read_i32();
		let hide_at_start = self.read_bool();
		let animation = self.read_i32();
		let skew_x = self.read_f32();
		let skew_y = self.read_f32();
		let locked_animation_angles = self.read_bool();
		let start_anim = self.read_string();
		let start_frame = self.read_i32();

		SpriteObjectData { version, coll_mode, auto_mirror, auto_flip, auto_rotations, auto_rotations_combo, hide_at_start, animation, skew_x, skew_y, locked_animation_angles, start_anim, start_frame }
	}
}

impl BlockWriter {
	fn write_sprite_obj(&mut self, obj: &SpriteObjectData) {
		self.write_i32(obj.version);
		self.write_i32(obj.coll_mode);
		self.write_i32(obj.auto_mirror);
		self.write_i32(obj.auto_flip);
		self.write_i32(obj.auto_rotations);
		self.write_i32(obj.auto_rotations_combo);
		self.write_bool(obj.hide_at_start);
		self.write_i32(obj.animation);
		self.write_f32(obj.skew_x);
		self.write_f32(obj.skew_y);
		self.write_bool(obj.locked_animation_angles);
		self.write_string(&obj.start_anim);
		self.write_i32(obj.start_frame);
	}
}
