#![feature(try_blocks)]

pub const VERSION: &str = env!("CARGO_PKG_VERSION");

mod util;
mod macros;
mod tcr;
pub use util::*;
pub use tcr::*;

#[doc(hidden)]
pub use futures;
