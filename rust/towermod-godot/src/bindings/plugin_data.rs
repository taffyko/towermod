use godot::prelude::*;
use super::*;
use towermod::cstc;



GD_AUTOSTRUCT! {
	#[var(get)]
	pub .. "towermod/src/cstc/plugin.rs" cstc::plugin::Param {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcParam {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcParam {
		type Data = cstc::plugin::Param;
		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcParam, data: cstc::plugin::Param);
			Gd::from_object(INIT!(CstcParam))
		}
		fn to_data(&self) -> Self::Data {
			unimplemented!()
		}
	}
}
#[godot_api] impl CstcParam {}


GD_AUTOSTRUCT! {
	#[var(get)]
	pub .. "towermod/src/cstc/plugin.rs" cstc::plugin::AcesEntry {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcAcesEntry {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcAcesEntry {
		type Data = cstc::plugin::AcesEntry;
		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcAcesEntry, data: cstc::plugin::AcesEntry);
			Gd::from_object(INIT!(CstcAcesEntry))
		}
		fn to_data(&self) -> Self::Data {
			unimplemented!()
		}
	}
}
#[godot_api] impl CstcAcesEntry {}

GD_AUTOSTRUCT! {
	#[var(get)]
	pub .. "towermod/src/cstc/plugin.rs" cstc::plugin::CPropItem {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcCPropItem {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcCPropItem {
		type Data = cstc::plugin::CPropItem;
		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcCPropItem, data: cstc::plugin::CPropItem);
			Gd::from_object(INIT!(CstcCPropItem))
		}
		fn to_data(&self) -> Self::Data {
			unimplemented!()
		}
	}
}
#[godot_api] impl CstcCPropItem {}

GD_AUTOSTRUCT! {
	#[var(get)]
	pub .. "towermod/src/cstc/plugin.rs" cstc::plugin::PluginStringTable {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcPluginStringTable {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcPluginStringTable {
		type Data = cstc::plugin::PluginStringTable;
		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcPluginStringTable, data: cstc::plugin::PluginStringTable);
			Gd::from_object(INIT!(CstcPluginStringTable))
		}
		fn to_data(&self) -> Self::Data {
			unimplemented!()
		}
	}
}
#[godot_api] impl CstcPluginStringTable {}

GD_AUTOSTRUCT! {
	#[var(get)]
	pub .. "towermod/src/cstc/plugin.rs" cstc::plugin::PluginData {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcPluginData {
		#[allow(unused)]
		owner: Gd<WeakRef>,
		#[var(get)]
		plugin_id: i32,
	}
	impl CstcBinding for CstcPluginData {
		type Data = cstc::plugin::PluginData;

		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			let cstc_data: Gd<CstcData> = owner.get_ref().to();
			let cstc_data = cstc_data.bind();
			godot_print!("plugin: {}", &data.string_table.name);
			let mut plugin_id: i32 = -1;
			if let Some((plugin_id_variant, _)) = cstc_data.plugin_names.iter_shared().find(|(_i, plugin_name)| {
				let p1 = gd_to_string(&plugin_name.try_to::<GString>().unwrap());
				godot_print!("gd: {}", p1);
				return p1 == *data.string_table.name
			}) {
				plugin_id = plugin_id_variant.to();
			}
			FIELDS!(CstcPluginData, data: cstc::plugin::PluginData);
			Gd::from_object(INIT!(CstcPluginData))
		}

		fn to_data(&self) -> Self::Data {
			unimplemented!()
		}
	}
}
#[godot_api]
impl CstcPluginData {}
