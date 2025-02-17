use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Default, Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TowermodConfig {
	pub game_path: Option<PathBuf>,
}

pub type State = TowermodConfig;

pub enum Action {
	SetConfig(State),
}

impl From<Action> for super::app_state::Action {
	fn from(value: Action) -> Self {
		Self::Config(value)
	}
}

pub fn reducer(state: State, action: Action) -> State {
	match (action) {
		Action::SetConfig(state) => state,
	}
}

