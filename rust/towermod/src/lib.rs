#![feature(test)]
#![feature(try_blocks)]
#![feature(async_closure)]
#![feature(anonymous_lifetime_in_impl_trait)]
#![feature(str_from_utf16_endian)]
#![allow(unused_parens)]
#![allow(unused_import_braces)]

pub const VERSION: &str = env!("CARGO_PKG_VERSION");

extern crate test;
mod config;
mod run;
mod project;
pub mod tcr;
pub mod util;
pub mod cstc;
pub mod macros;

pub use project::*;
pub use config::*;
pub use run::*;
