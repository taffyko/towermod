use crate::app::state::select;
use crate::{Game, Project};

pub async fn get_project() -> Option<Project> {
	select(|s| s.project.clone()).await
}

pub async fn get_game() -> Option<Game> {
	select(|s| s.game.clone()).await
}
