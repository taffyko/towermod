use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use redux_rs::{Selector, Store};
use crate::Project;
use super::data_state as data;

pub enum Action {
	Data(data::Action),
	SetProject(Option<Project>),
}
impl Action {
	pub async fn dispatch(self, store: &AppStore) {
		store.dispatch(self).await;
	}
}

#[derive(Debug, Default, Deserialize, Serialize)]
pub struct State {
	pub data: data::State,
	pub project: Option<Project>,
}

pub fn reducer(mut state: State, action: Action) -> State {
	match action {
		Action::Data(action) => {
			state.data = data::reducer(state.data, action);
		}
		Action::SetProject(project) => {
			state.project = project
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

