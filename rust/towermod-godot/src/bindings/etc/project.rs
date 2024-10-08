use autostruct::AUTOENUM;
use godot::prelude::*;
use godot::classes::*;
use towermod::ProjectType;
use std::convert::From;
use std::path::PathBuf;
use crate::{bindings::*, util::{promise, Promise}};
use towermod::{Project, Game, GameType, ModType, ModInfo};
use num_derive::{FromPrimitive, ToPrimitive};
use godot::register::{GodotConvert, Var};
use strum_macros::{EnumIter, Display};


AUTOENUM! {
	#[derive(Debug, Clone, Copy, EnumIter, Display, FromPrimitive, ToPrimitive, GodotConvert, Var, Export, Default)]
	#[godot(via = GString)]
	#[repr(i32)]
	pub enum TowermodGameType {}
	#[attr_first(default)]
	.. "towermod/src/project.rs" GameType;
}

AUTOENUM! {
	#[derive(Debug, Clone, Copy, EnumIter, Display, FromPrimitive, ToPrimitive, GodotConvert, Var, Export, Default)]
	#[godot(via = GString)]
	#[repr(i32)]
	pub enum TowermodProjectType {}
	#[attr_first(default)]
	.. "towermod/src/project.rs" ProjectType;
}

AUTOENUM! {
	#[derive(Debug, Clone, Copy, EnumIter, Display, FromPrimitive, ToPrimitive, GodotConvert, Var, Export, Default)]
	#[godot(via = GString)]
	#[repr(i32)]
	pub enum TowermodModType {}
	#[attr_first(default)]
	.. "towermod/src/project.rs" ModType;
}

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/project.rs" Project {}
	#[derive(Debug, GodotClass)]
	#[class(init, base=Resource)]
	pub struct TowermodProject {}
	impl From<&Project> for TowermodProject {
		fn from(value: &Project) -> Self {
			FIELDS!(TowermodProject, value: Project);
			INIT!(TowermodProject)
		}
	}
	impl From<&TowermodProject> for Project {
		fn from(value: &TowermodProject) -> Self {
			FIELDS!(Project, value: TowermodProject);
			INIT!(Project)
		}
	}
}
#[godot_api]
impl TowermodProject {
	#[func]
	fn from_path(path: String) -> Promise<Gd<TowermodProject>> {
		promise! {
			let project: TowermodProject = From::from(&Project::from_path(path).await?);
			Gd::from_object(project)
		}
	}
}

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/project.rs" Game {}
	#[derive(Debug, GodotClass)]
	#[class(init, base=Resource)]
	pub struct TowermodGame {}
	impl From<&Game> for TowermodGame {
		fn from(value: &Game) -> Self {
			FIELDS!(TowermodGame, value: Game);
			INIT!(TowermodGame)
		}
	}
	impl From<&TowermodGame> for Game {
		fn from(value: &TowermodGame) -> Self {
			FIELDS!(Game, value: TowermodGame);
			INIT!(Game)
		}
	}
}
#[godot_api]
impl TowermodGame {}

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/project.rs" ModInfo {
		#[map(option_vec_to_image, option_image_to_vec)]
		#[var]
		pub icon: Option<Gd<Image>>,
		#[map(option_vec_to_image, option_image_to_vec)]
		#[var]
		pub cover: Option<Gd<Image>>,
	}
	#[derive(Debug, GodotClass)]
	#[class(init, base=Resource)]
	pub struct TowermodModInfo {}
	impl From<&ModInfo> for TowermodModInfo {
		fn from(value: &ModInfo) -> Self {
			FIELDS!(TowermodModInfo, value: ModInfo);
			INIT!(TowermodModInfo)
		}
	}
	impl From<&TowermodModInfo> for ModInfo {
		fn from(value: &TowermodModInfo) -> Self {
			FIELDS!(ModInfo, value: TowermodModInfo);
			INIT!(ModInfo)
		}
	}
}
#[godot_api]
impl TowermodModInfo {
	#[func]
	pub fn unique_name(&self) -> String {
		towermod::unique_name(&self.author.to_string(), &self.name.to_string())
	}

	#[func]
	pub fn unique_version_name(&self) -> String {
		towermod::unique_version_name(&self.author.to_string(), &self.name.to_string(), &self.version.to_string())
	}
	
	#[func]
	pub fn from_zip_path(path: String) -> Promise<Gd<Self>> {
		promise! {
			Gd::from_object(TowermodModInfo::from(&ModInfo::from_zip_path(path).await?))
		}
	}
}
