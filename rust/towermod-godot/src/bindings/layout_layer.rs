use godot::engine::global::PropertyHint;
use godot::prelude::*;
use strum::IntoEnumIterator;
use super::*;
use towermod::cstc;

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::LayoutLayer {
		#[var(get)] pub id,
		#[var(get)] pub objects,
	}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcLayoutLayer {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcLayoutLayer {
		type Data = cstc::LayoutLayer;

		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcLayoutLayer, data: cstc::LayoutLayer);
			Gd::from_object(INIT!(CstcLayoutLayer))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::LayoutLayer, self: CstcLayoutLayer);
			INIT!(cstc::LayoutLayer)
		}
	}
}
#[godot_api]
impl CstcLayoutLayer {
	#[func]
	pub fn custom_property_info(&self, property: GString) -> Dictionary {
		let mut pinfo = Dictionary::new();
		match &*property.to_string() {
			"layer_type" => {
				pinfo.set("hint", PropertyHint::ENUM);
				pinfo.set("hint_string", enum_hint_string(CstcLayerType::iter()));
			},
			"sampler" => {
				pinfo.set("hint", PropertyHint::ENUM);
				pinfo.set("hint_string", enum_hint_string(CstcLayerSamplerMode::iter()));
			},
			_ => {},
		}
		pinfo
	}
}
