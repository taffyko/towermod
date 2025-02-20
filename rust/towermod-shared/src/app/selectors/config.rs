use crate::app::state::{select, TowermodConfig};

pub async fn get_config() -> TowermodConfig {
	select(|s| s.config.clone()).await
}
