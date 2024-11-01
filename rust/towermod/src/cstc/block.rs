use crate::Nt;

use super::{stable::DataKey, Animation, AnimationFrame};

pub struct BlockReader<'a> {
	pub pos: usize,
	pub buffer: &'a[u8],
}

impl<'a> BlockReader<'a> {
	pub fn new(buffer: &'a[u8]) -> Self {
		BlockReader {
			pos: 0,
			buffer,
		}
	}

	pub fn read_bytes(&mut self, amount: usize) -> Vec<u8> {
		self.pos += amount;
		self.buffer[self.pos-amount..self.pos].to_owned()
	}

	pub fn read_string(&mut self) -> String {
		let len = self.read_u32() as usize;
		assert_eq!(self.buffer[self.pos+len-1], 0); // all strings end with a NUL
		let slice = &self.buffer[self.pos..self.pos+len-1]; // exclude the terminating NUL byte
		self.pos += len;
		String::from_utf8_lossy(slice).to_string()
	}

	pub fn read_collection<F, T>(&mut self, mut read_fn: F) -> Vec<T>
	where
		F: FnMut(&mut Self) -> T,
	{
		let count = self.read_u32() as usize;
		let mut list: Vec<T> = Vec::with_capacity(count);
		for _ in 0..count {
			list.push(read_fn(self));
		}
		list
	}

	pub fn check_u8(&self) -> u8 {
		self.buffer[self.pos]
	}

	pub fn read_bool(&mut self) -> bool {
		self.pos += 1;
		self.buffer[self.pos-1] != 0
	}

	pub fn read_u8(&mut self) -> u8 {
		self.pos += 1;
		self.buffer[self.pos-1]
	}

	pub fn read_i32(&mut self) -> i32 {
		self.pos += 4;
		i32::from_le_bytes(self.buffer[self.pos-4..self.pos].try_into().unwrap())
	}

	pub fn read_u32(&mut self) -> u32 {
		self.pos += 4;
		u32::from_le_bytes(self.buffer[self.pos-4..self.pos].try_into().unwrap())
	}

	pub fn read_f32(&mut self) -> f32 {
		self.pos += 4;
		f32::from_le_bytes(self.buffer[self.pos-4..self.pos].try_into().unwrap())
	}

	pub fn read_i64(&mut self) -> i64 {
		self.pos += 8;
		i64::from_le_bytes(self.buffer[self.pos-8..self.pos].try_into().unwrap())
	}

	pub fn read_f64(&mut self) -> f64 {
		self.pos += 8;
		f64::from_le_bytes(self.buffer[self.pos-8..self.pos].try_into().unwrap())
	}

	pub fn read_data_key(&mut self) -> DataKey {
		let key = self.read_string();
		let i_type = self.read_i32();
		match i_type {
			0 => DataKey::Pointer(key, self.read_u32()),
			_ => DataKey::String(key, self.read_string()),
		}
	}

	pub fn read_animation(&mut self) -> Animation {
		let id = self.read_i32();

		let name = self.read_string();
		let tag = self.read_i32();

		let speed = Nt(self.read_f32());
		let is_angle = self.read_u8() != 0;
		let angle = Nt(self.read_f32());

		let repeat_count = self.read_i32();
		let repeat_to = self.read_i32();
		let ping_pong = self.read_i32() != 0;

		let frames = self.read_collection(Self::read_animation_frame);

		let sub_animations = self.read_collection(Self::read_animation);

		Animation { id, name, tag, speed, is_angle, angle, repeat_count, repeat_to, ping_pong, frames, sub_animations, _type: "Animation" }
	}

	fn read_animation_frame(&mut self) -> AnimationFrame {
		let duration = Nt(self.read_f32());
		let image_id = self.read_i32();
		AnimationFrame { duration, image_id, _type: "AnimationFrame" }
	}
}

pub struct BlockWriter {
	pub buffer: Vec<u8>,
}

impl BlockWriter {
	pub fn new() -> Self {
		BlockWriter {
			buffer: Vec::new(),
		}
	}

	pub fn write_bytes(&mut self, bytes: &[u8]) {
		self.buffer.extend(bytes);
	}

	pub fn write_string(&mut self, string: &str) {
		self.buffer.extend((string.len() as u32 + 1).to_le_bytes());
		self.buffer.extend(string.as_bytes());
		self.buffer.push(0);
	}

	pub fn write_collection<F, T>(&mut self, mut write_fn: F, collection: &[T])
	where
		F: FnMut(&mut Self, &T),
	{
		self.write_u32(collection.len() as u32);
		for item in collection {
			write_fn(self, item);
		}
	}

	pub fn write_bool(&mut self, val: bool) {
		self.buffer.push(if val { 1u8 } else { 0u8 });
	}

	pub fn write_u8(&mut self, val: u8) {
		self.buffer.push(val);
	}

	pub fn write_i32(&mut self, val: i32) {
		self.buffer.extend(val.to_le_bytes());
	}

	pub fn write_u32(&mut self, val: u32) {
		self.buffer.extend(val.to_le_bytes());
	}

	pub fn write_f32(&mut self, val: impl Into<f32>) {
		let val = val.into();
		self.buffer.extend(val.to_le_bytes());
	}

	pub fn write_i64(&mut self, val: i64) {
		self.buffer.extend(val.to_le_bytes());
	}

	pub fn write_f64(&mut self, val: f64) {
		self.buffer.extend(val.to_le_bytes());
	}

	pub fn write_data_key(&mut self, global_key: &DataKey) {
		match global_key {
			DataKey::Pointer(key, data) => {
				self.write_string(key);
				self.write_u32(*data);
			}
			DataKey::String(key, string) => {
				self.write_string(key);
				self.write_string(string);
			}
		}
	}

	pub fn write_animation(&mut self, anim: &Animation) {
		self.write_i32(anim.id);

		self.write_string(&anim.name);
		self.write_i32(anim.tag);

		self.write_f32(anim.speed);
		self.write_u8(anim.is_angle as u8);
		self.write_f32(anim.angle);

		self.write_i32(anim.repeat_count);
		self.write_i32(anim.repeat_to);
		self.write_i32(anim.ping_pong as i32);

		self.write_collection(Self::write_animation_frame, &anim.frames);

		self.write_collection(Self::write_animation, &anim.sub_animations);
	}

	fn write_animation_frame(&mut self, frame: &AnimationFrame) {
		self.write_f32(frame.duration);
		self.write_i32(frame.image_id);
	}
}
