/// Run a block of code at the end of an async block, even if it returns early with an error, and even if it panics
#[macro_export]
macro_rules! async_cleanup {
	(do $cleanup:block $($body:tt)*) => {
		{
			let result = $crate::futures::FutureExt::catch_unwind(std::panic::AssertUnwindSafe(async { $($body)* })).await;
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

#[macro_export]
macro_rules! clone {
	(@expand_let $i:ident) => { let $i = $i.clone(); };
	(@expand_let mut $i:ident) => { let mut $i = $i.clone(); };
	(@expand_let ref $i:ident) => { let $i = $i.to_owned(); };
	(@expand_let ref mut $i:ident) => { let mut $i = $i.to_owned(); };
	(@($($($i:ident)+),*) $($body:tt)*) => {
		{
			$(
				$crate::clone!(@expand_let $($i)+);
			)*
			move || { $($body)* }
		}
	};
	($($body:tt)*) => { move || { $($body)* } };
}


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
#[macro_export]
macro_rules! blocking {
	($($body:tt)*) => { tokio::task::spawn_blocking($crate::clone!($($body)*)) };
}

#[macro_export]
macro_rules! json_object {
	(...$object:ident, $($name:ident: $value:expr),*) => {
		{
			use anyhow::Context;
			let result: anyhow::Result<serde_json::Value> = try {
				let mut value = serde_json::value::to_value($object)?;
				{
					let map = value.as_object_mut()
						.context(format!("Could not interpret {} as a JSON object", stringify!($object)))?;
					$(
						map.insert(stringify!($name).to_string(), ($value).into());
					)*
				}
				value
			};
			result
		}
	};
	($($name:ident: $value:expr),*) => {
		{
			let mut map: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();
			$(
				map.insert(stringify!($name).to_string(), ($value).into());
			)*
			serde_json::Value::Object(map)
		}
	};
}
