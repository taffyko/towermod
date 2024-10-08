use godot::engine::global::PropertyHint;
use godot::prelude::*;
use strum::IntoEnumIterator;
use super::*;
use towermod::cstc;

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::AppBlock {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcAppBlock {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcAppBlock {
		type Data = cstc::AppBlock;

		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcAppBlock, data: cstc::AppBlock);
			Gd::from_object(INIT!(CstcAppBlock))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::AppBlock, self: CstcAppBlock);
			INIT!(cstc::AppBlock)
		}
	}
}
#[godot_api]
impl CstcAppBlock {
	#[func]
	pub fn custom_property_info(&self, property: GString) -> Dictionary {
		let mut pinfo = Dictionary::new();
		match &*property.to_string() {
			"fps_mode" => {
				pinfo.set("hint", PropertyHint::ENUM);
				pinfo.set("hint_string", enum_hint_string(CstcFpsMode::iter()));
			},
			"sampler_mode" => {
				pinfo.set("hint", PropertyHint::ENUM);
				pinfo.set("hint_string", enum_hint_string(CstcSamplerMode::iter()));
			},
			"simulate_shaders" => {
				pinfo.set("hint", PropertyHint::ENUM);
				pinfo.set("hint_string", enum_hint_string(CstcSimulateShadersMode::iter()));
			},
			"text_rendering_mode" => {
				pinfo.set("hint", PropertyHint::ENUM);
				pinfo.set("hint_string", enum_hint_string(CstcTextRenderingMode::iter()));
			},
			"resize_mode" => {
				pinfo.set("hint", PropertyHint::ENUM);
				pinfo.set("hint_string", enum_hint_string(CstcResizeMode::iter()));
			},
			"texture_loading_mode" => {
				pinfo.set("hint", PropertyHint::ENUM);
				pinfo.set("hint_string", enum_hint_string(CstcTextureLoadingMode::iter()));
			},
			_ => {},
		}
		pinfo
	}
}

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::GlobalVariable {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcGlobalVariable {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcGlobalVariable {
		type Data = cstc::GlobalVariable;

		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcGlobalVariable, data: cstc::GlobalVariable);
			Gd::from_object(INIT!(CstcGlobalVariable))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::GlobalVariable, self: CstcGlobalVariable);
			INIT!(cstc::GlobalVariable)
		}
	}
}
#[godot_api]
impl CstcGlobalVariable {}

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::BehaviorControl {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcBehaviorControl {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcBehaviorControl {
		type Data = cstc::BehaviorControl;

		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcBehaviorControl, data: cstc::BehaviorControl);
			Gd::from_object(INIT!(CstcBehaviorControl))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::BehaviorControl, self: CstcBehaviorControl);
			INIT!(cstc::BehaviorControl)
		}
	}
}
#[godot_api]
impl CstcBehaviorControl {}
