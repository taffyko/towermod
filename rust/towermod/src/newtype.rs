//! monuments to the orphan rules
use std::{collections::{HashMap, HashSet}, ops::{Deref, DerefMut}, path::PathBuf};
use napi::{bindgen_prelude::*, NapiRaw};

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
impl<V, T: FromIterator<V>> FromIterator<V> for Nt<T> where{
	fn from_iter<U: IntoIterator<Item = V>>(iter: U) -> Self {
		Nt(iter.into_iter().collect())
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
impl<'de, T> ::serde::Deserialize<'de> for Nt<T> where
	T: ::serde::Deserialize<'de>
{
	fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
	where D: ::serde::Deserializer<'de>
	{
		T::deserialize(deserializer).map(|o| Nt(o))
	}
}

impl<T> ::serde::Serialize for Nt<T> where
	T: ::serde::Serialize
{
	fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
	where S: ::serde::Serializer
	{
		self.0.serialize(serializer)
	}
}

// ClassInstance
impl<'env, T: 'static> NapiRaw for Nt<ClassInstance<'env, T>> where
{
	unsafe fn raw(&self) -> napi::sys::napi_value {
		self.0.raw()
	}
}


// f32
impl From<Nt<f32>> for f32 {
	fn from(Nt(value): Nt<f32>) -> Self {
		value
	}
}
impl FromNapiValue for Nt<f32> {
	unsafe fn from_napi_value(env: sys::napi_env, napi_val: sys::napi_value) -> Result<Self> {
		let s: f64 = FromNapiValue::from_napi_value(env, napi_val)?;
		Ok(Nt(s as f32))
	}
}
impl ToNapiValue for Nt<f32> {
	unsafe fn to_napi_value(env: napi::sys::napi_env, val: Self) -> napi::Result<napi::sys::napi_value> {
		ToNapiValue::to_napi_value(env, val.0)
	}
}

// Vec<u8>
impl From<Nt<Vec<u8>>> for Vec<u8> {
	fn from(Nt(value): Nt<Vec<u8>>) -> Self {
		value
	}
}
impl FromNapiValue for Nt<Vec<u8>> {
	unsafe fn from_napi_value(env: sys::napi_env, napi_val: sys::napi_value) -> Result<Self> {
		let buf: Uint8Array = FromNapiValue::from_napi_value(env, napi_val)?;
		Ok(Nt(buf.to_vec()))
	}
}
impl ToNapiValue for Nt<Vec<u8>> {
	unsafe fn to_napi_value(env: napi::sys::napi_env, val: Self) -> napi::Result<napi::sys::napi_value> {
		let val = Uint8Array::new(val.0);
		Uint8Array::to_napi_value(env, val)
	}
}


// HashMap<i32, V>
impl<V> ToNapiValue for Nt<HashMap<i32, V>> where
	V: ToNapiValue
{
	// convert to object with string keys (for compatibility with Redux)
	unsafe fn to_napi_value(raw_env: sys::napi_env, val: Self) -> Result<sys::napi_value> {
		let env = Env::from(raw_env);
		let mut obj = env.create_object()?;
		for (k, v) in val.0.into_iter() {
			obj.set(k.to_string(), v)?;
		}

		unsafe { Object::to_napi_value(raw_env, obj) }
	}
}
impl<V, S> FromNapiValue for Nt<HashMap<i32, V, S>> where
	V: FromNapiValue,
	S: Default + std::hash::BuildHasher,
{
	unsafe fn from_napi_value(env: sys::napi_env, napi_val: sys::napi_value) -> Result<Self> {
		let obj = unsafe { Object::from_napi_value(env, napi_val)? };
		let mut map = HashMap::default();
		for key in Object::keys(&obj)?.into_iter() {
			if let Some(val) = obj.get(&key)? {
				if let Ok(key) = i32::from_str_radix(&key, 10) {
					map.insert(key, val);
				}
			}
		}

		Ok(Nt(map))
	}
}

// HashSet
impl<V> ToNapiValue for Nt<HashSet<V>> where
	V: ToNapiValue
{
	unsafe fn to_napi_value(env: sys::napi_env, val: Self) -> Result<sys::napi_value> {
		let vec: Vec<V> = val.0.into_iter().collect();
		ToNapiValue::to_napi_value(env, vec)
	}
}
impl<V> FromNapiValue for Nt<HashSet<V>> where
	V: FromNapiValue + std::cmp::Eq + std::hash::Hash
{
	unsafe fn from_napi_value(env: sys::napi_env, napi_val: sys::napi_value) -> Result<Self> {
		let vec: Vec<V> = FromNapiValue::from_napi_value(env, napi_val)?;
		Ok(Nt(vec.into_iter().collect()))
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
impl FromNapiValue for Nt<PathBuf> {
	unsafe fn from_napi_value(env: sys::napi_env, napi_val: sys::napi_value) -> Result<Self> {
		let s: String = FromNapiValue::from_napi_value(env, napi_val)?;
		Ok(Nt(PathBuf::from(s)))
	}
}
// TODO: this has no effect on .d.ts generation
// nudge napi-derive-backend to enable overriding the default TS type name emitted for a struct
impl TypeName for Nt<PathBuf> {
	fn type_name() -> &'static str { "string" }
	fn value_type() -> ValueType { napi::ValueType::String }
}

// OffsetDateTime
impl ToNapiValue for Nt<time::OffsetDateTime> {
	unsafe fn to_napi_value(env: napi::sys::napi_env, val: Self) -> napi::Result<napi::sys::napi_value> {
		let mut ptr = std::ptr::null_mut();
		let millis_since_epoch_utc = val.0.unix_timestamp() as f64;

		napi::check_status!(
		  unsafe { napi::sys::napi_create_date(env, millis_since_epoch_utc, &mut ptr) },
		  "Failed to convert rust type `DateTime` into napi value",
		)?;

		Ok(ptr)
	}
}
impl FromNapiValue for Nt<time::OffsetDateTime> {
	unsafe fn from_napi_value(env: sys::napi_env, napi_val: sys::napi_value) -> Result<Self> {
		use std::ptr;
		let mut to_iso_string = ptr::null_mut();
		check_status!(
			unsafe {
				napi::sys::napi_create_string_utf8(
					env,
					"toISOString\0".as_ptr().cast(),
					11,
					&mut to_iso_string,
				)
			},
			"create toISOString JavaScript string failed"
		)?;
		let mut to_iso_string_method = ptr::null_mut();
		check_status!(
			unsafe { sys::napi_get_property(env, napi_val, to_iso_string, &mut to_iso_string_method) },
			"get toISOString method failed"
		)?;
		let mut iso_string_value = ptr::null_mut();
		check_status!(
			unsafe {
				sys::napi_call_function(
					env,
					napi_val,
					to_iso_string_method,
					0,
					ptr::null(),
					&mut iso_string_value,
				)
			},
			"Call toISOString on Date Object failed"
		)?;

		let mut iso_string_length = 0;
		check_status!(
			unsafe {
				sys::napi_get_value_string_utf8(
					env,
					iso_string_value,
					ptr::null_mut(),
					0,
					&mut iso_string_length,
				)
			},
			"Get ISOString length failed"
		)?;
		let mut iso_string = String::with_capacity(iso_string_length + 1);
		check_status!(
			unsafe {
				sys::napi_get_value_string_utf8(
					env,
					iso_string_value,
					iso_string.as_mut_ptr().cast(),
					iso_string_length,
					&mut iso_string_length,
				)
			},
			"Get ISOString length failed"
		)?;

		unsafe { iso_string.as_mut_vec().set_len(iso_string_length) };

		let date = time::OffsetDateTime::parse(
			iso_string.as_str(),
			&time::format_description::well_known::Iso8601::DEFAULT
		).map_err(|err| {
			Error::new(
				Status::InvalidArg,
				format!(
					"Failed to convert napi value into rust type `NaiveDateTime` {} {}",
					err, iso_string
				),
			)
		})?;

		Ok(Nt(date))
	}
}


pub mod serde {
	// Implement time::serde::rfc3339 for Nt<OffsetDateTime>
	pub mod rfc3339 {
		use crate::newtype::*;
		use ::serde::{Serializer, Deserializer};
		use std::result::Result;
		use time::OffsetDateTime;
		pub fn serialize<S: Serializer>(
			datetime: &Nt<OffsetDateTime>,
			serializer: S,
		) -> Result<S::Ok, S::Error> {
			time::serde::rfc3339::serialize(&datetime.0, serializer)
		}

		pub fn deserialize<'a, D: Deserializer<'a>>(deserializer: D) -> Result<Nt<OffsetDateTime>, D::Error> {
			time::serde::rfc3339::deserialize(deserializer).map(|v| Nt(v))
		}

		pub mod option {
			use super::*;

			pub fn serialize<S: Serializer>(
				option: &Option<Nt<OffsetDateTime>>,
				serializer: S,
			) -> Result<S::Ok, S::Error> {
				time::serde::rfc3339::option::serialize(&option.map(|Nt(v)| v), serializer)
			}

			pub fn deserialize<'a, D: Deserializer<'a>>(
				deserializer: D,
			) -> Result<Option<Nt<OffsetDateTime>>, D::Error> {
				time::serde::rfc3339::option::deserialize(deserializer).map(|o| o.map(|v| Nt(v)))
			}
		}
	}
}
