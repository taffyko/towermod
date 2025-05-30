#![feature(test)]
#![feature(default_field_values)]
#![feature(try_blocks)]
#![feature(anonymous_lifetime_in_impl_trait)]
#![feature(str_from_utf16_endian)]
#![feature(min_specialization)]
#![feature(never_type)]
#![feature(impl_trait_in_fn_trait_return)]
#![feature(impl_trait_in_bindings)]
#![feature(closure_lifetime_binder)]
#![allow(unused_parens)]
#![allow(unused_import_braces)]

pub mod dllreader_client;
pub mod game_images;
pub mod cstc_editing;

pub mod app;
mod newtype;
mod project;
mod config;
mod pe_resource;
mod filesystem;
pub use newtype::*;
pub use project::*;
pub use config::*;
pub use pe_resource::*;
pub use filesystem::*;

pub use towermod_util;
pub use towermod_cstc;
pub use towermod_win32;
