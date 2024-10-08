use godot::prelude::*;
use super::*;
use towermod::cstc;

#[derive(Debug, GodotClass)]
#[class(init)]
pub struct CstcEventBlock {
	#[allow(unused)]
	owner: Gd<WeakRef>,
	#[var]
	pub sheet_names: Array<GString>,
	#[var]
	pub layout_sheets: Array<Gd<CstcEventSheet>>,
}
impl CstcBinding for CstcEventBlock {
	type Data = cstc::EventBlock;
	
	fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
		let layout_sheets = data.layout_sheets.iter().map(|events| {
			CstcEventSheet::from_data(events, owner.clone())
		}).collect();
		let sheet_names = string_vec_to_gd(&data.sheet_names);

		Gd::from_object(Self { sheet_names, layout_sheets, owner })
	}

	fn to_data(&self) -> Self::Data {
		let layout_sheets = gd_to_data_vec(&self.layout_sheets);
		Self::Data {
			sheet_names: gd_to_string_vec(&self.sheet_names),
			layout_sheets,
		}
	}
}


#[derive(Debug, GodotClass)]
#[class(init)]
pub struct CstcEventSheet {
	#[allow(unused)]
	owner: Gd<WeakRef>,
	#[var]
	pub events: Array<Gd<Object>>,
}
impl CstcBinding for CstcEventSheet {
	type Data = Vec<cstc::SomeEvent>;
	
	fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
		let events = cstc_events_to_gd(&data, &owner);
		Gd::from_object(Self { events, owner })
	}

	fn to_data(&self) -> Self::Data {
		let events = gd_to_cstc_events(&self.events);
		events
	}
}

#[godot_api]
impl CstcEventSheet {}

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::EventGroup {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcEventGroup {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcEventGroup {
		type Data = cstc::EventGroup;

		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcEventGroup, data: cstc::EventGroup);
			Gd::from_object(INIT!(CstcEventGroup))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::EventGroup, self: CstcEventGroup);
			INIT!(cstc::EventGroup)
		}
	}
}
#[godot_api]
impl CstcEventGroup {}

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::Event {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcEvent {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcEvent {
		type Data = cstc::Event;

		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcEvent, data: cstc::Event);
			Gd::from_object(INIT!(CstcEvent))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::Event, self: CstcEvent);
			INIT!(cstc::Event)
		}
	}
}
#[godot_api]
impl CstcEvent {}


#[derive(Debug, GodotClass)]
#[class(init)]
pub struct CstcEventInclude {
	#[allow(unused)]
	owner: Gd<WeakRef>,
	#[var] pub id: i32,
}
impl CstcBinding for CstcEventInclude {
	type Data = i32;
	fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
		Gd::from_object(Self { id: *data, owner })
	}
	fn to_data(&self) -> Self::Data {
		self.id
	}
}
#[godot_api]
impl CstcEventInclude {}


GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::EventCondition {
		pub params,
	}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcEventCondition {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcEventCondition {
		type Data = cstc::EventCondition;

		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcEventCondition, data: cstc::EventCondition);
			Gd::from_object(INIT!(CstcEventCondition))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::EventCondition, self: CstcEventCondition);
			INIT!(cstc::EventCondition)
		}
	}
}
#[godot_api]
impl CstcEventCondition {}

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::EventAction {
		pub params,
	}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcEventAction {
		#[allow(unused)]
		owner: Gd<WeakRef>,
		#[var(get)]
		pub object_type: Option<Gd<CstcObjectType>>,
		#[var(get)]
		pub action_info: Option<Gd<CstcAcesEntry>>,
		#[var(get)]
		pub plugin_info: Option<Gd<CstcPluginData>>,
	}
	impl CstcBinding for CstcEventAction {
		type Data = cstc::EventAction;

		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcEventAction, data: cstc::EventAction);
			let cstc_data: Gd<CstcData> = owner.get_ref().to();
			let cstc_data = cstc_data.bind();
			let mut plugin_info: Option<Gd<CstcPluginData>> = None;
			let mut object_type: Option<Gd<CstcObjectType>> = None;
			if data.object_id == -1 {
				plugin_info = cstc_data.editor_plugins.get(-1).unwrap().try_to::<Gd<CstcPluginData>>().ok();
			} else {
				object_type = cstc_data.get_object_type(data.object_id);
				if let Some(object_type) = &object_type {
					plugin_info = cstc_data.editor_plugins.get(object_type.bind().plugin_id).unwrap().try_to::<Gd<CstcPluginData>>().ok();
				};
			}
			let mut action_info: Option<Gd<CstcAcesEntry>> = None;
			if let Some(plugin_info) = &plugin_info {
				if let Some(variant) = plugin_info.bind().actions.get(data.action_id) {
					action_info = variant.try_to::<Gd<CstcAcesEntry>>().ok();
				}
			}

			Gd::from_object(INIT!(CstcEventAction))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::EventAction, self: CstcEventAction);
			INIT!(cstc::EventAction)
		}
	}
}
#[godot_api]
impl CstcEventAction {}
