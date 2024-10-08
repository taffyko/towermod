use godot::prelude::*;
use super::*;
use towermod::cstc;

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/pluginobjects.rs" cstc::SpriteObjectData {
		pub version,
	}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcSpriteObjectData {
		#[allow(unused)]
		owner: Gd<WeakRef>,
		#[var(get)] pub plugin_name: GString,
	}
	impl CstcBinding for CstcSpriteObjectData {
		type Data = cstc::SpriteObjectData;

		fn from_data(data: &cstc::SpriteObjectData, owner: Gd<WeakRef>) -> Gd<CstcSpriteObjectData> {
			FIELDS!(CstcSpriteObjectData, data: cstc::SpriteObjectData);
			let plugin_name = "Sprite".into();
			Gd::from_object(INIT!(CstcSpriteObjectData))
		}

		fn to_data(&self) -> cstc::SpriteObjectData {
			FIELDS!(cstc::SpriteObjectData, self: CstcSpriteObjectData);
			INIT!(cstc::SpriteObjectData)
		}
	}
}
#[godot_api]
impl CstcSpriteObjectData {}

