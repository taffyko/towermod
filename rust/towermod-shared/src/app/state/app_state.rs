use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use redux_rs::{Selector, Store};
use crate::{Game, Project};
use super::data_state as data;
use super::config_state as config;

pub enum Action {
	Data(data::Action),
	Config(config::Action),
	SetProject(Option<Project>),
	EditProjectInfo(Project),
	SetGame(Option<Game>),
}

#[derive(Debug, Default, Deserialize, Serialize)]
pub struct State {
	pub config: config::TowermodConfig,
	pub data: data::State,
	pub project: Option<Project>,
	pub game: Option<Game>,
}

pub fn reducer(mut state: State, action: Action) -> State {
	match action {
		Action::Data(action) => {
			state = data::reducer(state, action);
		}
		Action::Config(action) => {
			state.config = config::reducer(state.config, action);
		}
		Action::SetProject(Some(project)) => {
			state.project = Some(project);
		}
		Action::SetProject(None) => {
			state.project = None;
			state.data = data::State::default();
		}
		Action::EditProjectInfo(project) => {
			state.project = Some(project);
		}
		Action::SetGame(game) => {
			state.game = game;
			state.project = None;
			state.data = data::State::default();
		}
	}
	state
}

pub type AppStore = Store<State, Action, fn (State, Action) -> State>;

lazy_static! {
	pub static ref STORE: AppStore = Store::new(reducer);
}

pub async fn select<S: Fn(&State) -> Result, Result>(selector: S) -> Result
where
	S: Selector<State, Result = Result> + Send + 'static,
	Result: Send + 'static,
{
	STORE.select(selector).await
}

/// Easily transform/clone a value before it is returned from the select() function
#[macro_export]
macro_rules! select {
	($selector:expr, |$s:ident, $r:ident| $e:expr) => {
		{
			let selector = $selector;
			let selector = move |$s: &'_ $crate::app::state::app_state::State| {
				let $r = selector($s);
				$e
			};
			$crate::app::state::select(selector)
		}
	};
	($selector:expr, |$r:ident| $e:expr) => {
		{
			let selector = $selector;
			let selector = move |s: &'_ $crate::app::state::app_state::State| {
				let $r = selector(s);
				$e
			};
			$crate::app::state::select(selector)
		}
	};
}

pub async fn dispatch(action: impl Into<Action>) {
	STORE.dispatch(action.into()).await;
}
