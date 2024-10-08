use godot::engine::global::PropertyHint;
use godot::prelude::*;
use strum::IntoEnumIterator;
use super::*;
use towermod::cstc;
use super::enums::CstcTextureLoadingMode;

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::Layout {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcLayout {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcLayout {
		type Data = cstc::Layout;

		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcLayout data: cstc::Layout, p_);
			let p_owner = owner;
			Gd::from_object(INIT!(CstcLayout, p_))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::Layout, self: CstcLayout, p_);
			INIT!(cstc::Layout, p_)
		}
	}
}

#[godot_api]
impl CstcLayout {
	#[func]
	pub fn custom_property_info(&self, property: GString) -> Dictionary {
		let mut pinfo = Dictionary::new();
		match &*property.to_string() {
			"texture_loading_mode" => {
				pinfo.set("hint", PropertyHint::ENUM);
				pinfo.set("hint_string", enum_hint_string(CstcTextureLoadingMode::iter()));
			},
			_ => {},
		}
		pinfo
	}
}
