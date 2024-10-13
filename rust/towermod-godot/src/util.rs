use std::{cell::RefCell, ops::Deref, panic::PanicHookInfo, sync::Mutex};

use futures::FutureExt;
use godot::{builtin::{Array, GString, Variant}, log::godot_print, meta::ToGodot, obj::Gd};
use godot::classes::object::ConnectFlags;
use godot::classes::*;
use godot::prelude::*;
use tokio::runtime::{Runtime, self};
use once_cell::sync::Lazy;
use uuid::Uuid;
use crate::app::{Towermod};

mod unsafe_gd;
pub use unsafe_gd::*;

/// tokio runtime provided by the library for its own use.
pub static RUNTIME: Lazy<Runtime> = Lazy::new(|| {
	runtime::Builder::new_multi_thread()
		.enable_all()
		.build()
		.unwrap()
});
pub static HOOK_SET: Mutex<bool> = Mutex::new(false);
lazy_static::lazy_static! {
	pub static ref ORIGINAL_HOOK: Mutex<Option<Box<dyn Fn(&PanicHookInfo) + 'static + Sync + Send>>> = Mutex::new(None);
	pub static ref APP: tokio::sync::RwLock<godot::obj::InstanceId> = tokio::sync::RwLock::new(Towermod::singleton().instance_id());
	pub static ref APP_CONTENTION_BACKTRACES: Mutex<Vec<(Uuid, bool, backtrace::Backtrace)>> = Mutex::new(Vec::new());
	pub static ref LAST_BACKTRACE: Mutex<Option<backtrace::Backtrace>> = Mutex::new(None);
}
thread_local! {
	pub static BACKTRACE: RefCell<Option<backtrace::Backtrace>> = RefCell::new(None);
}

macro_rules! bind_mutex {
	(@phase2 $is_mut:ident, $($body:tt)*) => {
		#[cfg(debug_assertions)]
		let uuid = uuid::Uuid::new_v4();
		#[cfg(debug_assertions)]
		{
			let bt = backtrace::Backtrace::new();
			let mut traces = crate::util::APP_CONTENTION_BACKTRACES.lock().unwrap();
			traces.push((uuid, $is_mut, bt));
			if (traces.iter().any(|x| x.1) && traces.len() > 1) {
				println!("CONTENTION:");
				traces.iter().enumerate().for_each(|(i, x)| {
					println!("Lock {i}:\n{}", crate::util::filtered_backtrace(&x.2));
				})
			}
		}
		$($body)*
		#[cfg(debug_assertions)]
		scopeguard::defer! {
			let mut traces = crate::util::APP_CONTENTION_BACKTRACES.lock().unwrap();
			let i = traces.iter().position(|x| x.0 == uuid).unwrap();
			traces.remove(i);
		}
	};
	(mut $i:ident @ $path:expr ; $type:ty) => {
		$crate::util::bind_mutex!(@phase2 true,
			let instance_id = $path.write().await;
			let mut this = godot::obj::Gd::<$type>::from_instance_id(*instance_id);
			let mut $i = this.bind_mut();
		)
	};
	($i:ident @ $path:expr ; $type:ty) => {
		$crate::util::bind_mutex!(@phase2 false,
			let instance_id = $path.read().await;
			let this = godot::obj::Gd::<$type>::from_instance_id(*instance_id);
			let $i = this.bind();
		)
	};
	(@block mut $i:ident @ $path:expr ; $type:ty) => {
		$crate::util::bind_mutex!(@phase2 true,
			let instance_id;
			if let Ok(inst_id) = $path.try_write() {
				instance_id = inst_id;
			} else {
				if let Ok(_) = tokio::runtime::Handle::try_current() {
					instance_id = tokio::task::block_in_place(|| { $path.blocking_write() });
				} else {
					instance_id = $path.blocking_write();
				}
			}
			let mut this = godot::obj::Gd::<$type>::from_instance_id(*instance_id);
			let mut $i = this.bind_mut();
		)
	};
	(@block $i:ident @ $path:expr ; $type:ty) => {
		$crate::util::bind_mutex!(@phase2 false,
			let instance_id;
			if let Ok(inst_id) = $path.try_read() {
				instance_id = inst_id;
			} else {
				if let Ok(_) = tokio::runtime::Handle::try_current() {
					instance_id = tokio::task::block_in_place(|| { $path.blocking_read() });
				} else {
					instance_id = $path.blocking_read();
				}
			}
			let this = godot::obj::Gd::<$type>::from_instance_id(*instance_id);
			let $i = this.bind();
		)
	};
}
macro_rules! app {
	($($tokens:tt)+) => {
		$crate::util::bind_mutex!($($tokens)+ @ crate::util::APP ; crate::app::Towermod)
	};
}


pub fn filtered_backtrace(bt: &backtrace::Backtrace) -> String {
	let frames: Vec<_> = bt
	.frames()
	.iter()
	.filter(|frame| {
		if let Some(symbol) = frame.symbols().first() {
			if let Some(filename) = symbol.filename() {
				return filename.to_string_lossy().contains("towermod")
			} else if let Some(name) = symbol.name() {
				return name.as_str().unwrap_or_default().contains("towermod")
			}
		}
		false
	})
	.collect();
	let display = format::Display(|f| {
		let mut print_path = |fmt: &mut std::fmt::Formatter<'_>, path: backtrace::BytesOrWideString<'_>| {
			let path = path.into_path_buf();
			std::fmt::Display::fmt(&path.display(), fmt)
		};
		let mut backtrace = backtrace::BacktraceFmt::new(f, backtrace::PrintFmt::Short, &mut print_path);
		backtrace.add_context()?;
		for frame in &frames {
			backtrace.frame().backtrace_frame(frame)?;
		}
		backtrace.finish()?;
		Ok(())
	});
	format!("{display}")
}

pub(crate) use app;
// pub(crate) use app2;
pub(crate) use bind_mutex;

macro_rules! promise {
	($($body:tt)*) => {
		crate::util::with_promise({
			crate::util::handle_err(async move {
				try {
					$($body)*
				}
			})
		})
	};
}

#[derive(Debug)]
pub struct Promise<T> {
	pub instance_id: InstanceId,
	phantom: std::marker::PhantomData<T>,
}
impl<T> Promise<T> {
	pub fn new() -> Self {
		let mut obj = Object::new_alloc();

		obj.add_user_signal_ex(GString::from("resolve"))
			.arguments(Array::from(&[Variant::nil().to_variant()]))
			.done();
		obj.add_user_signal_ex(GString::from("reject"))
			.arguments(Array::from(&[]))
			.done();
		obj.add_user_signal_ex(GString::from("settled"))
			.arguments(Array::from(&[Variant::nil().to_variant()]))
			.done();
		let signal_resolve = Signal::from_object_signal(&obj, "resolve");
		let signal_reject = Signal::from_object_signal(&obj, "reject");

		let instance_id = obj.instance_id();
		signal_resolve.connect(Callable::from_fn("callback", move |_args| {
			let obj: Gd<Object> = Gd::from_instance_id(instance_id);
			obj.free();
			Ok(Variant::nil())
		}), ConnectFlags::DEFERRED.ord().into());
		signal_reject.connect(Callable::from_fn("callback", move |_args| {
			let obj: Gd<Object> = Gd::from_instance_id(instance_id);
			obj.free();
			Ok(Variant::nil())
		}), ConnectFlags::DEFERRED.ord().into());
		Promise { instance_id, phantom: std::marker::PhantomData }
	}

	fn as_signal(&self) -> Signal {
		let obj: Gd<Object> = Gd::from_instance_id(self.instance_id);
		let resolve = Signal::from_object_signal(&obj, "resolve");
		resolve
	}

	pub fn reject(&self) {
		let mut obj: Gd<Object> = Gd::from_instance_id(self.instance_id);
		obj.call_deferred(StringName::from("emit_signal"), &["settled".to_variant(), Variant::nil().to_variant()]);
		obj.call_deferred(StringName::from("emit_signal"), &["reject".to_variant()]);
	}
}
impl<T> Promise<T> where
	T: ToGodot,
{
	pub fn resolve(&self, result: T) {
		let mut obj: Gd<Object> = Gd::from_instance_id(self.instance_id);
		obj.call_deferred(StringName::from("emit_signal"), &["settled".to_variant(), result.to_variant()]);
		obj.call_deferred(StringName::from("emit_signal"), &["resolve".to_variant(), result.to_variant()]);
	}
}
impl<T> Clone for Promise<T> {
	fn clone(&self) -> Self {
		Self { instance_id: self.instance_id.clone(), phantom: self.phantom.clone() }
	}
}
impl<T> Copy for Promise<T> {}
impl<T> GodotConvert for Promise<T> {
	type Via = Signal;
}
impl<T> ToGodot for Promise<T> where
	T: ToGodot
{
	fn to_godot(&self) -> Self::Via {
		self.as_signal()
	}
}
impl<T> FromGodot for Promise<T> {
	fn try_from_godot(via: Self::Via) -> Result<Self, ConvertError> {
		let obj = via.object().ok_or(ConvertError::default())?;
		let instance_id = obj.instance_id();
		Ok(Self { instance_id, phantom: std::marker::PhantomData })
	}
}
unsafe impl<T> Send for Promise<T> {}
unsafe impl<T> Sync for Promise<T> {}

pub fn with_promise<F, T>(future: F) -> Promise<T>
where
	F: std::future::Future<Output = Option<T>> + Send + 'static,
	T: godot::meta::ToGodot + 'static,
{
	let promise = Promise::<T>::new();

	RUNTIME.spawn(async move {
		let result = future.await;
		if let Some(result) = result {
			promise.resolve(result);
		} else {
			promise.reject();
		}
	});

	promise
}

pub async fn handle_err<F, T>(future: F) -> Option<T>
where
	F: std::future::Future<Output = Result<T, anyhow::Error>> + Send,
{
	let result = catch_unwind_future(future).await;
	match result {
		Ok(r) => match r {
			Ok(v) => Some(v),
			Err(e) => {
				crate::util::show_error(e);
				None
			},
		},
		Err(any) => {
			let mut msg: String;
			if let Some(e) = any.downcast_ref::<String>() {
				msg = format!("PANIC: {e}");
			} else if let Some(e) = any.downcast_ref::<&str>() {
				msg = format!("PANIC: {e}");
			} else {
				msg = format!("PANIC");
			}
			crate::util::BACKTRACE.with_borrow_mut(|val| {
				let mut last_bt = crate::util::LAST_BACKTRACE.lock().unwrap();
				if let Some(backtrace) = val {
					msg += &format!("\nbacktrace:\n{}", filtered_backtrace(backtrace));
					*val = None;
					*last_bt = None;
				} else if last_bt.is_some() {
					let backtrace = last_bt.as_ref().unwrap();
					msg += &format!("\nlast backtrace:\n{}", filtered_backtrace(backtrace));
					*last_bt = None;
				} else {
					msg += &format!("\nbacktrace:\n  (backtrace instance not set)");
				}
			});
			crate::util::show_string_error(&msg);
			std::panic::resume_unwind(any);
		}
	}
}

pub async fn catch_unwind_future<F, T>(future: F) -> Result<T, Box<dyn std::any::Any + Send>>
where
	F: std::future::Future<Output = T> + Send,
{
	let hook_set = *HOOK_SET.lock().unwrap();
	if !hook_set {
		std::panic::set_hook(Box::new(|panic_info| {
			// hook to record the call stack at the moment of panic
			let bt = backtrace::Backtrace::new();
			crate::util::BACKTRACE.with_borrow_mut(|val| {
				*val = Some(bt.clone());
			});
			{
				let mut val = crate::util::LAST_BACKTRACE.lock().unwrap();
				*val = Some(bt);
			}
			if let Some(ref original_hook) = *crate::util::ORIGINAL_HOOK.lock().unwrap() {
				original_hook(panic_info);
			}
		}));
		*HOOK_SET.lock().unwrap() = true;
	}

	let result = std::panic::AssertUnwindSafe(future).catch_unwind().await;

	if !hook_set {
		if let Some(original_hook) = crate::util::ORIGINAL_HOOK.lock().unwrap().take() {
			std::panic::set_hook(original_hook);
		}
		*HOOK_SET.lock().unwrap() = false;
	}
	result
}

pub fn show_string_error(msg: &str) {
	godot_print!("[RUST] Error: {}\n", msg);
	// Emit signal on application singleton
	Towermod::emit("rust_error", &[GString::from(msg).to_variant()]);
}

pub fn show_error(msg: impl std::fmt::Debug) {
	let msg = format!("{:?}", msg);
	show_string_error(&msg);
}

macro_rules! status {
	($($arg:tt)*) => {
		$crate::messenger::Messenger::status(&format!($($arg)*));
	}
}
pub(crate) use status;
pub(crate) use promise;
