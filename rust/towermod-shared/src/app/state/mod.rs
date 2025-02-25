//! Over time, I want to move the application state away from Redux and entirely into Rust,
//! and query slices of state as-needed over an API boundary to drive UI code.
//! (like a conventional server-client web app architecture)
//!
//! The overhead of updating such a large state in Redux on the JS side
//! and transferring it back-and-forth over NodeJS-Rust FFI boundary just doesn't scale,
//! causing inevitable freezing and stuttering.
//! Simple JSON serialization-deserialization is also virtually always faster than FFI.

pub mod app_state;
pub mod data_state;
pub mod config_state;

pub use data_state::{Action as DataAction};
pub use config_state::{TowermodConfig, Action as ConfigAction};
pub use app_state::{STORE, select, Action as AppAction};
