use std::{ops::{Deref, DerefMut}, path::PathBuf};
use napi::bindgen_prelude::*;

pub struct Nt<T>(pub T);

impl<T> From<T> for Nt<T> {
	fn from(value: T) -> Self {
		Self(value)
	}
}
impl<T> Deref for Nt<T> {
	type Target = T;
	fn deref(&self) -> &Self::Target {
		&self.0
	}
}
impl<T, U> AsRef<U> for Nt<T> where
	T: AsRef<U>, U: ?Sized
{
	fn as_ref(&self) -> &U {
		self.0.as_ref()
	}
}
impl<T> DerefMut for Nt<T> {
	fn deref_mut(&mut self) -> &mut Self::Target {
		&mut self.0
	}
}
impl<T: Clone> Clone for Nt<T> {
	fn clone(&self) -> Self {
		Self(self.0.clone())
	}
}
impl<T: Copy> Copy for Nt<T> {}
impl<T: std::fmt::Debug> std::fmt::Debug for Nt<T> {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		self.0.fmt(f)
	}
}
impl<T: PartialEq<Y>, Y> PartialEq<Y> for Nt<T> {
	fn eq(&self, other: &Y) -> bool {
		self.0.eq(other)
	}
}
impl<T: Default> Default for Nt<T> {
	fn default() -> Self {
		Self(Default::default())
	}
}

// PathBuf
impl From<Nt<PathBuf>> for PathBuf {
	fn from(Nt(value): Nt<PathBuf>) -> Self {
		value
	}
}
impl ToNapiValue for Nt<PathBuf> {
	unsafe fn to_napi_value(env: napi::sys::napi_env, val: Self) -> napi::Result<napi::sys::napi_value> {
		let s = val.to_string_lossy();
		ToNapiValue::to_napi_value(env, &*s)
	}
}

// TODO: this has no effect on .d.ts generation
// nudge napi-derive-backend to enable overriding the default TS type name emitted for a struct
impl TypeName for Nt<PathBuf> {
	fn type_name() -> &'static str { "string" }
	fn value_type() -> ValueType { napi::ValueType::String }
}
impl<T> TypeName for &Nt<T> where
	Nt<T>: TypeName
{
	fn type_name() -> &'static str { <Nt<T> as TypeName>::type_name() }
	fn value_type() -> ValueType { <Nt<T> as TypeName>::value_type() }
}
impl<T> TypeName for &mut Nt<T> where
	Nt<T>: TypeName
{
	fn type_name() -> &'static str { <Nt<T> as TypeName>::type_name() }
	fn value_type() -> ValueType { <Nt<T> as TypeName>::value_type() }
}
