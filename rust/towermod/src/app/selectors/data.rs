//! APIs for requesting data from the state

use crate::app::state::select;
use anyhow::{Context, Result};
use crate::{Game, Nt, Project};
use fs_err::tokio as fs;
