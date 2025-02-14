//! monuments to the orphan rules
use std::{ops::{Deref, DerefMut}, path::PathBuf};

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

impl<'de, T> ::serde::Deserialize<'de> for Nt<T> where
	T: ::serde::Deserialize<'de>
{
	fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
	where D: ::serde::Deserializer<'de>
	{
		T::deserialize(deserializer).map(|o| Nt(o))
	}
}

// // NOTE: needs specialization
// impl<T> ::serde::Serialize for Nt<T> where
// 	T: ::serde::Serialize
// {
// 	fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
// 	where S: ::serde::Serializer
// 	{
// 		self.0.serialize(serializer)
// 	}
// }

impl ::serde::Serialize for Nt<PathBuf> {
	fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
	where S: ::serde::Serializer
	{
		self.0.serialize(serializer)
	}
}

// Vec<u8>
impl From<Nt<Vec<u8>>> for Vec<u8> {
	fn from(Nt(value): Nt<Vec<u8>>) -> Self {
		value
	}
}

// PathBuf
impl From<Nt<PathBuf>> for PathBuf {
	fn from(Nt(value): Nt<PathBuf>) -> Self {
		value
	}
}

pub mod serde {
	// Implement time::serde::rfc3339 for Nt<OffsetDateTime>
	pub mod rfc3339 {
		use crate::Nt;
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
