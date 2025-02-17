#![allow(unused_parens)]
#![allow(unused_import_braces)]

#[cfg(target_arch="x86")]
fn main() {
	use towermod::cstc::plugin::{x86_plugin_ffi};
	let action = env::args().nth(1).expect("Missing action argument");
	match &*action {
		"editorplugin" => {
			let path = env::args().nth(2).expect("Missing filepath argument");
			let data = x86_plugin_ffi::read_editor_plugin(path).unwrap();
			let msgpack_data = rmp_serde::to_vec(&data).unwrap();
			let mut stdout = io::stdout().lock();
			stdout.write_all(&msgpack_data).unwrap();
		}
		"editorplugin-json" => {
			let path = env::args().nth(2).expect("Missing filepath argument");
			let data = x86_plugin_ffi::read_editor_plugin(path).unwrap();
			let json_data = serde_json::to_string_pretty(&data).unwrap();
			let mut stdout = io::stdout().lock();
			write!(stdout, "{}", &json_data).unwrap();
		}
		_ => panic!("Invalid action: {}", action),
	}
}
#[cfg(not(target_arch="x86"))]
fn main() {
	panic!("Can only compile dllreader for x86");
}
