#![feature(test)]
#![feature(default_field_values)]
#![feature(try_blocks)]
#![feature(anonymous_lifetime_in_impl_trait)]
#![feature(str_from_utf16_endian)]
#![feature(min_specialization)]
#![feature(never_type)]
#![allow(unused_parens)]
#![allow(unused_import_braces)]

pub const VERSION: &str = env!("CARGO_PKG_VERSION");

extern crate test;

mod etc;
pub use etc::*;
pub use towermod_util::*;

pub mod cstc;
pub mod app;
#[cfg(feature = "tauri")]
pub mod tauri;

