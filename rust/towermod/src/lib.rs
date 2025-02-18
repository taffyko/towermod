#![feature(test)]
#![feature(default_field_values)]
#![feature(try_blocks)]
#![feature(anonymous_lifetime_in_impl_trait)]
#![feature(str_from_utf16_endian)]
#![feature(min_specialization)]
#![feature(never_type)]
#![allow(unused_parens)]
#![allow(unused_import_braces)]

extern crate test;

pub use towermod_util::*;
pub use towermod_shared::*;
pub mod cstc {
	pub use towermod_cstc::*;
}

pub mod app;

pub mod tauri;

