use std::path::PathBuf;
use towermod::cstc;
use towermod::cstc::decode_object_data;
use towermod::cstc::ObjectData;
use towermod::read_dllblock_names;
use towermod::try_find_towerclimb;
use towermod::read_pe_file_resource;
use towermod::ResId;

fn exe_path() -> PathBuf {
	match std::env::var("TOWERMOD_GAME_PATH") {
		Ok(v) => PathBuf::from(v),
		Err(_) => try_find_towerclimb().unwrap()
	}
}

#[test]
fn image_block() {
	let path = exe_path();
	let bin_before = read_pe_file_resource(&path, &ResId::from("IMAGEBLOCK"), &ResId::from(995)).unwrap();
	let data = cstc::deserialize_imageblock(&bin_before).unwrap();
	let bin_after = cstc::serialize_imageblock(&data).unwrap();
	assert_eq!(bin_before, bin_after);
}

#[test]
fn event_block() {
	let path = exe_path();
	let bin_before = read_pe_file_resource(&path, &ResId::from("EVENTBLOCK"), &ResId::from(999)).unwrap();
	// verify that no foreign events exist in each event sheet
	let data = cstc::deserialize_eventblock(&bin_before).unwrap();
	let bin_after = cstc::serialize_eventblock(&data).unwrap();
	assert_eq!(bin_before, bin_after);
}

#[test]
fn app_block() {
	let path = exe_path();
	let bin_before = read_pe_file_resource(&path, &ResId::from("APPBLOCK"), &ResId::from(997)).unwrap();
	let data = cstc::deserialize_appblock(&bin_before).unwrap();
	let bin_after = cstc::serialize_appblock(&data).unwrap();
	assert_eq!(bin_before, bin_after);
}

#[test]
fn level_block() {
	// let plugin_names;
	let runtime = tokio::runtime::Builder::new_multi_thread()
		.enable_all()
		.build()
		.unwrap();

	let path = exe_path();
	let names = runtime.block_on(read_dllblock_names(&path)).unwrap();
	let bin_before = read_pe_file_resource(&path, &ResId::from("LEVELBLOCK"), &ResId::from(998)).unwrap();
	let data = cstc::deserialize_levelblock(&bin_before).unwrap();
	for layout in &data.layouts {
		for layer in &layout.layers {
			for object in &layer.objects {
				let object_type = data.object_types.iter().find(|t| t.id == object.object_type_id).unwrap();
				let deserialized_object_data = decode_object_data(&object.data, &names[&object_type.plugin_id]);
				match deserialized_object_data {
					ObjectData::Sprite(o_data) => { assert_eq!(object.data, o_data.to_bin()); },
					ObjectData::Text(o_data) => { assert_eq!(object.data, o_data.to_bin()); },
					_ => {}
				}
			}
		}
	}
	let bin_after = cstc::serialize_levelblock(&data).unwrap();
	assert_eq!(bin_before, bin_after);
}
