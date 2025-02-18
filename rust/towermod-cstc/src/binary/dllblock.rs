use anyhow::Result;
use super::block::{BlockReader, BlockWriter};
use super::stable::*;

pub fn deserialize_dllblock(buffer: &[u8]) -> Result<DllBlock> {
	let mut reader = BlockReader::new(buffer);
	Ok(reader.read_dllblock())
}

pub fn serialize_dllblock(data: &DllBlock) -> Result<Vec<u8>> {
	let mut writer = BlockWriter::new();
	writer.write_dllblock(data)?;
	Ok(writer.buffer)
}

impl BlockReader<'_> {
	fn read_dllblock(&mut self) -> DllBlock {
	}
}

impl BlockWriter {
	fn write_dllblock(&mut self, data: &DllBlock) -> Result<()> {
		todo!()
	}
}
