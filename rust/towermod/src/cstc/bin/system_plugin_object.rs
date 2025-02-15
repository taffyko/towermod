use std::collections::HashMap;

use crate::cstc::plugin::{AcesEntry, PluginData, PluginStringTable};

/// The 'System' plugin (id: -1) is not an actual SDK plugin like the others,
/// the APIs it exposes are hardcoded into the Construct Classic executable.
/// Since we can't dynamically query its capabilities like we can a with an SDK plugin, we just have to manually hardcode that metadata here.
pub fn get_system_plugin() -> PluginData {
	PluginData {
		conditions: aces_entries(get_system_condition_names()),
		actions: aces_entries(get_system_action_names()),
		expressions: HashMap::new(),
		cnd_categories: HashMap::new(),
		act_categories: HashMap::new(),
		exp_categories: HashMap::new(),
		properties: Vec::new(),
		string_table: PluginStringTable { name: "System".into(), author: "".into(), version: "1.00".into(), desc: "System".into(), category: "System".into(), web: "".into() }
	}
}

// TODO

fn aces_entries(map: HashMap<i32, &'static str>) -> HashMap<i32, AcesEntry> {
	map.into_iter().map(|(i, name)| {
		(i, AcesEntry { resource_id: 0, ace_name: name.to_owned(), ace_description: "".into(), retrn: 0, params: Vec::new(), ace_list_name: "".into(), ace_category: "".into(), ace_display_text: "".into(), script_name: name.into(), aux_str: "".into() })
	}).collect()
}

fn get_system_action_names() -> HashMap<i32, &'static str> {
	HashMap::from([
		(0, "FlushClipboard"),
		(1, "SetClipboardText"),
		(2, "WriteINI"),
		(3, "PlaySound"),
		(4, "ScrollX"),
		(5, "ScrollY"),
		(6, "SetDisplayAngle"),
		// 7: SetGlobalFilter
		(8, "StartLoop"),
		(9, "StopLoop"),
		(10, "Break"),
		(11, "MessageBox"),
		(12, "CreateObject"),
		(13, "CreateObjectByName"),
		(14, "NextFrame"),
		(15, "PreviousFrame"),
		(16, "GoToFrame"),
		(17, "Quit"),
		(18, "CancelClose"),
		(19, "SetFPS"),
		(20, "SetGlobal"),
		(21, "AddGlobal"),
		(22, "SubGlobal"),
		(23, "EnableGroup"),
		(24, "ScrollToObject"),
		(25, "Serialize"),
		(26, "EndModalFrame"),
		(27, "CreateRelativePP"),
		(28, "CreateRelativeIP"),
		(29, "SetLayerXScrollRatio"),
		(30, "SetLayerYScrollRatio"),
		(31, "SetLayerZoomOffset"),
		(32, "SetLayerXScrollOffset"),
		(33, "SetLayerYScrollOffset"),
		(34, "SetLayerZoomRate"),
		(35, "SetLayerVisible"),
		(36, "SetLayerOpacity"),
		(37, "SetLayerFilter"),
		(38, "SetZoom"),
		(39, "SetLayoutSize"),
		(40, "SetResolution"),
		(41, "Quicksave"),
		// 42 : FxActivate
		// 43 : FxDeactivate
		// 44 : FxSetParam
		(45, "RunScript"),
		(46, "SetMotionBlur"),
		(47, "SetFullscreen"),
		(48, "SetTimeScale"),
		(49, "SetLayerAngle"),
		(50, "ToggleGroup"),
		(51, "LoadTextures"),
		(52, "AddToAttribute"),
		(53, "EnableLayerEffect"),
		(54, "SetLayerEffectParam"),
		(55, "ChangeProjection"),
	])
}

fn get_system_condition_names() -> HashMap<i32, &'static str> {
	HashMap::from([
		(1, "Start of layout"),
		(2, "End of layout"),
		// 3: Start of application
		(4, "End of application"),
		(5, "Always"),
		(6, "Compare"),
		(7, "Evaluate"),
		(8, "OnLoop"),
		(9, "While"),
		(10, "For"),
		(11, "Repeat"),
		(12, "ForEach"),
		(13, "CompareGlobalVariable"),
		(14, "EveryXMilliseconds"),
		(15, "EveryXTicks"),
		(16, "CompareTime"),
		(17, "Else"),
		(18, "OR"),
		(19, "Object overlaps point"),
		(20, "Object collides with point"),
		(21, "Trigger once wihle true"),
		(22, "Value is of type"),
		(23, "Menu item clicked (by text)"),
		(24, "Menu item clicked (by id)"),
		(25, "Python Compare"),
		(26, "Motion blur supported"),
		(27, "ForEachOrdered"),
		(28, "On collision (advanced)"),
		(29, "Is overlapping (advanced)"),
		(30, "Is group activated?"),
		(31, "Number is between..."),
		(32, "Angle is clockwise of..."),
		(33, "On load"),
		(34, "On device reset"),
		(35, "Is layer visible?"),
	])
}
