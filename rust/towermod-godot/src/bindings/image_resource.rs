use godot::{engine::Image, prelude::*};
use super::*;
use towermod::cstc;

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::ImageMetadata {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcImageMetadata {
		#[allow(unused)]
		pub owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcImageMetadata {
		type Data = cstc::ImageMetadata;

		fn from_data(cstc_data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcImageMetadata, cstc_data: cstc::ImageMetadata);
			Gd::from_object(INIT!(CstcImageMetadata))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::ImageMetadata, self: CstcImageMetadata);
			INIT!(cstc::ImageMetadata)
		}
	}
}
#[godot_api]
impl CstcImageMetadata {
	#[func]
	pub fn image_from_collision_mask(bits: PackedByteArray, pitch: i32, width: i32, height: i32) -> Gd<Image> {
		let mut image = Image::create(width, height, false, godot::classes::image::Format::RGBA8).unwrap();
		let color_on = Color { r: 1., g: 1., b: 1., a: 1. };
		let color_off = Color { r: 1., g: 1., b: 1., a: 0. };

		// Loop each pixel and set the bit in the bitmask
		for x in 0..width {
			for y in 0..height {
				let bit = bits[(y * pitch + (x / 8)) as usize] & (1 << (7 - (x % 8)));
				image.set_pixel(x, y, if bit > 0 {color_on} else {color_off})
			}
		}

		image
	}

	#[func]
	pub fn create_collision_mask(image: Gd<Image>) -> Dictionary {
		// Determine size of our buffer. All buffers are rounded up to 128 bit pitch, just in case SSE can be used.
		let align_pitch_bits = 64;
		let align_pitch_bytes = align_pitch_bits / 8;
		
		let mut bits = PackedByteArray::new();
		let width = image.get_width();
		let height = image.get_height();

		let mut pitch = width / 8;
		if width % 8 != 0 {
			pitch += 1; // 11 pixel width needs 2 bytes not 1 rounded
		}

		// Eg. a 20 byte pitch must round up to 32 (+12, 16 - 4)
		if pitch % align_pitch_bytes != 0 {
			pitch += align_pitch_bytes - (pitch % align_pitch_bytes);
		}

		// If the pitch does not leave at least a 64 pixel gutter, increase it by 64 pixels.
		// This prevents false positives when a 64 pixel check from the far right edge can wrap around to the next line.
		if (pitch * 8) - width < align_pitch_bits {
			pitch += align_pitch_bytes;
		}

		// Allocate and zero the memory
		bits.resize((height * pitch) as usize);
		bits.fill(0);

		// Loop each pixel and set the bit in the bitmask
		for x in 0..width {
			for y in 0..height {
				// Set the bit (check alpha component)
				let bit = if image.get_pixel(x, y).a > 0. {1} else {0};
				
				bits[(y * pitch + (x / 8)) as usize] |= bit << (7 - (x % 8))
			}
		}
		
		Dictionary::from_iter([
			("mask", bits.to_variant()),
			("width", width.to_variant()),
			("height", height.to_variant()),
			("pitch", pitch.to_variant()),
		])
	}
}

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::ActionPoint {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcActionPoint {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcActionPoint {
		type Data = cstc::ActionPoint;

		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcActionPoint, data: cstc::ActionPoint);
			Gd::from_object(INIT!(CstcActionPoint))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::ActionPoint, self: CstcActionPoint);
			INIT!(cstc::ActionPoint)
		}
	}
}
#[godot_api]
impl CstcActionPoint {}
