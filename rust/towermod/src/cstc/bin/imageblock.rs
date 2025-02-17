use anyhow::Result;
use super::block::{BlockReader, BlockWriter};
use super::super::stable::*;

pub fn deserialize_imageblock(buffer: &[u8]) -> Result<Vec<ImageResource>> {
	let mut reader = BlockReader::new(buffer);
	Ok(reader.read_imageblock())
}

pub fn serialize_imageblock(images: &[ImageResource]) -> Result<Vec<u8>> {
	let mut writer = BlockWriter::new();
	writer.write_imageblock(images)?;
	Ok(writer.buffer)
}

impl BlockReader<'_> {
	fn read_imageblock(&mut self) -> Vec<ImageResource> {
		let mut images: Vec<ImageResource> = Vec::new();
		let image_count = self.read_i32();
		for _ in 0..image_count {
			let image = self.read_image();
			images.push(image);
		}
		images
	}

	fn read_image(&mut self) -> ImageResource {
		let id = self.read_i32();
		let hotspot_x = self.read_i32();
		let hotspot_y = self.read_i32();

		let mut apoints: Vec<ActionPoint> = Vec::new();
		let apoint_count = self.read_u32();
		for _ in 0..apoint_count {
			let x = self.read_i32();
			let y = self.read_i32();
			let string = self.read_string();
			apoints.push(ActionPoint { x, y, string });
		}
		let buffer_size = self.read_u32();
		let data = self.read_bytes(buffer_size as usize);
		let collision_width = self.read_u32();
		let collision_height = self.read_u32();
		let collision_pitch = self.read_i32();
		let collision_mask = self.read_bytes(collision_pitch as usize * collision_height as usize);

		ImageResource { id, hotspot_x, hotspot_y, data, apoints, collision_width, collision_height, collision_pitch, collision_mask }
	}
}

impl BlockWriter {
	fn write_imageblock(&mut self, images: &[ImageResource]) -> Result<()> {
		self.write_u32(images.len() as u32);
		for img in images {
			self.write_image(img);
		}
		Ok(())
	}

	fn write_image(&mut self, img: &ImageResource) {
		self.write_i32(img.id);
		self.write_i32(img.hotspot_x);
		self.write_i32(img.hotspot_y);
		self.write_u32(img.apoints.len() as u32);
		for apoint in &img.apoints {
			self.write_i32(apoint.x);
			self.write_i32(apoint.y);
			self.write_string(&apoint.string);
		}
		self.write_u32(img.data.len() as u32);
		self.write_bytes(&img.data);
		self.write_u32(img.collision_width);
		self.write_u32(img.collision_height);
		self.write_i32(img.collision_pitch);
		self.write_bytes(&img.collision_mask);
	}
}
