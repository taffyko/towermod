use godot::prelude::*;
use super::*;
use towermod::cstc;

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/pluginobjects.rs" cstc::TextObjectData {
		pub version,
		#[var]
		#[map(move |i| i != 0, move |b| b as i32)]
		italics: bool,
		#[var]
		#[map(move |i| i != 0, move |b| b as i32)]
		bold: bool,

	}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcTextObjectData {
		#[allow(unused)]
		owner: Gd<WeakRef>,
		#[var(get)] pub plugin_name: GString,
	}
	impl CstcBinding for CstcTextObjectData {
		type Data = cstc::TextObjectData;

		fn from_data(data: &cstc::TextObjectData, owner: Gd<WeakRef>) -> Gd<CstcTextObjectData> {
			FIELDS!(CstcTextObjectData, data: cstc::TextObjectData);
			let plugin_name = "Text".into();
			Gd::from_object(INIT!(CstcTextObjectData))
		}

		fn to_data(&self) -> cstc::TextObjectData {
			FIELDS!(cstc::TextObjectData, self: CstcTextObjectData);
			INIT!(cstc::TextObjectData)
		}
	}
}
#[godot_api]
impl CstcTextObjectData {}

