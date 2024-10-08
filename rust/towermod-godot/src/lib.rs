#![feature(io_error_more)]
#![feature(impl_trait_in_assoc_type)]
#![feature(associated_type_defaults)]
#![feature(try_blocks)]
#![feature(async_closure)]
use godot::{engine::Engine, prelude::*};
use app::Towermod;

struct MyExtension;

#[gdextension]
unsafe impl ExtensionLibrary for MyExtension {
	fn on_level_init(level: InitLevel) {
		if level == InitLevel::Core {
			// console_subscriber::init();
		}

		if level == InitLevel::Scene {
			Engine::singleton().register_singleton(
				StringName::from("Towermod"),
				Towermod::new_alloc().upcast(),
			);

			Engine::singleton().register_singleton(
				StringName::from("Messenger"),
				messenger::Messenger::new_alloc().upcast(),
			);
		}
	}

	fn on_level_deinit(level: InitLevel) {
		if level == InitLevel::Scene {
			let mut engine = Engine::singleton();

			let towermod_name = StringName::from("Towermod");
			let towermod_singleton = engine
				.get_singleton(towermod_name.clone())
				.expect("cannot retrieve the singleton");
			engine.unregister_singleton(towermod_name);
			towermod_singleton.free();

			let messenger_name = StringName::from("Messenger");
			let messenger_singleton = engine
				.get_singleton(messenger_name.clone())
				.expect("cannot retrieve the singleton");
			engine.unregister_singleton(messenger_name);
			messenger_singleton.free();
		}
	}
}

mod util;
/// Mappings from the stable deserialized Construct Classic data structures, to comfortably editable Godot engine objects
mod bindings;
mod mapping_helpers;
mod app;
mod messenger;
