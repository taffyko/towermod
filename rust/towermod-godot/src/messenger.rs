use std::collections::VecDeque;

use godot::{engine::Engine, prelude::*};


lazy_static::lazy_static! {
	pub static ref MESSENGER: tokio::sync::RwLock<godot::obj::InstanceId> = tokio::sync::RwLock::new(Messenger::singleton().instance_id());
}

macro_rules! get {
	($($tokens:tt)+) => {
		$crate::util::bind_mutex!($($tokens)+ @ crate::messenger::MESSENGER ; crate::messenger::Messenger)
	};
}
pub(crate) use get;

/// Type used to facilitate communication/signals between Rust and GDScript
/// Separate from other data to ensure that locks are only held as briefly as possible, keeping contention very low.
#[derive(Debug, GodotClass)]
#[class(base=Object)]
pub struct Messenger {
	pub base: Base<Object>,
	pub queue: VecDeque<Callable>,
}

#[godot_api]
impl Messenger {
	#[signal]
	fn rust_status_update(message: GString);

	#[func]
	fn singleton() -> Gd<Self> {
		let engine = Engine::singleton();
		engine.get_singleton(StringName::from("Messenger")).unwrap().cast()
	}

	#[func]
	pub fn poll_queue(&mut self) -> Variant {
		self.queue.pop_front().map_or(Variant::nil(), |c| c.to_variant())
	}

	pub fn status(msg: &str) {
		get!(@block mut m);
		m.base_mut().emit_signal(StringName::from("rust_status_update"), &[msg.to_variant()]);
	}
}

#[godot_api]
impl IObject for Messenger {
	fn init(base: Base<Object>) -> Self {
		Self {
			base,
			queue: VecDeque::new(),
		}
	}
}
