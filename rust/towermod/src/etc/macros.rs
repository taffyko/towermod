/// Run a block of code at the end of an async block, even if it returns early with an error, and even if it panics
#[macro_export]
macro_rules! async_cleanup {
	(do $cleanup:block $($body:tt)*) => {
		{
			let result = futures::FutureExt::catch_unwind(std::panic::AssertUnwindSafe(async { $($body)* })).await;
			match result {
				Ok(result) => {
					$cleanup;
					result
				}
				Err(payload) => {
					let _ = async { $cleanup; anyhow::Ok(()) }.await; // suppress ? and ignore result
					std::panic::resume_unwind(payload)
				}
			}
		}
	};
}
pub(crate) use async_cleanup;

macro_rules! clone {
	(@expand_let $i:ident) => { let $i = $i.clone(); };
	(@expand_let mut $i:ident) => { let mut $i = $i.clone(); };
	(@expand_let ref $i:ident) => { let $i = $i.to_owned(); };
	(@expand_let ref mut $i:ident) => { let mut $i = $i.to_owned(); };
	(@($($($i:ident)+),*) $($body:tt)*) => {
		{
			$(
				clone!(@expand_let $($i)+);
			)*
			move || { $($body)* }
		}
	};
	($($body:tt)*) => { move || { $($body)* } };
}
pub(crate) use clone;


#[macro_export]
macro_rules! clone_async {
	(@expand_let $i:ident) => { let $i = $i.clone(); };
	(@expand_let mut $i:ident) => { let mut $i = $i.clone(); };
	(@expand_let ref $i:ident) => { let $i = $i.to_owned(); };
	(@expand_let ref mut $i:ident) => { let mut $i = $i.to_owned(); };
	(@($($($i:ident)+),*) $($body:tt)*) => {
		{
			$(
				clone!(@expand_let $($i)+);
			)*
			async move { $($body)* }
		}
	};
	($($body:tt)*) => { async move { $($body)* } };
}

/// Run a block of code in a `tokio::task::spawn_blocking()` move closure
/// and tersely list captures that should be cloned instead of moved.
macro_rules! blocking {
	($($body:tt)*) => { tokio::task::spawn_blocking(clone!($($body)*)) };
}
pub(crate) use blocking;
