use godot::engine::global::PropertyHint;
use godot::prelude::*;
use strum::IntoEnumIterator;
use super::*;
use towermod::cstc;

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::ObjectType {
		#[var(get)] pub plugin_id,
		#[var(get)] pub id,
	}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcObjectType {
		owner: Gd<WeakRef>
	}
	impl CstcBinding for CstcObjectType {
		type Data = cstc::ObjectType;
		fn from_data(data: &cstc::ObjectType, owner: Gd<WeakRef>) -> Gd<CstcObjectType> {
			FIELDS!(CstcObjectType, data: cstc::ObjectType);
			Gd::from_object(INIT!(CstcObjectType))
		}
		fn to_data(&self) -> cstc::ObjectType {
			FIELDS!(cstc::ObjectType, self: CstcObjectType);
			INIT!(cstc::ObjectType)
		}
	}
}


#[godot_api]
impl CstcObjectType {
	#[func]
	pub fn get_plugin_name(&self) -> GString {
		let owner: Gd<CstcData> = self.owner.get_ref().to();
		let s = if let Some(s) = owner.bind().plugin_names.get(self.plugin_id) {
			if let Ok(s) = s.try_to() {
				s
			} else {
				GString::new()
			}
		} else {
			GString::new()
		};
		s
	}

	#[func]
	pub fn get_plugin_data(&self) -> Gd<CstcPluginData> {
		let cstc_data: Gd<CstcData> = self.owner.get_ref().to();
		let cstc_data = cstc_data.bind();
		cstc_data.get_plugin_data(self.plugin_id).unwrap()
	}
	
	#[func]
	pub fn custom_property_info(&self, property: GString) -> Dictionary {
		let mut pinfo = Dictionary::new();
		match &*property.to_string() {
			"destroy_when" => {
				pinfo.set("hint", PropertyHint::ENUM);
				pinfo.set("hint_string", enum_hint_string(CstcDisableShaderWhen::iter()));
			},
			_ => {},
		}
		pinfo
	}
}
