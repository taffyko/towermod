#![feature(try_blocks)]
#![allow(unused_parens)]
#![allow(unused_import_braces)]

#[cfg(all(windows, target_arch="x86"))]
mod plugin_ffi;

#[cfg(all(windows, target_arch="x86"))]
fn main() {
	use std::io::Write;
	let action = std::env::args().nth(1).expect("Missing action argument");
	match &*action {
		"editorplugin" => {
			let path = std::env::args().nth(2).expect("Missing filepath argument");
			let data = plugin_ffi::read_editor_plugin(path).unwrap();
			let msgpack_data = rmp_serde::to_vec(&data).unwrap();
			let mut stdout = std::io::stdout().lock();
			stdout.write_all(&msgpack_data).unwrap();
		}
		"editorplugin-json" => {
			let path = std::env::args().nth(2).expect("Missing filepath argument");
			let data = plugin_ffi::read_editor_plugin(path).unwrap();
			let json_data = serde_json::to_string_pretty(&data).unwrap();
			let mut stdout = std::io::stdout().lock();
			write!(stdout, "{}", &json_data).unwrap();
		}
		_ => panic!("Invalid action: {}", action),
	}
}

#[cfg(any(not(windows), not(target_arch="x86")))]
fn main() {
	panic!("Unsupported architecture");
}
