extends PanelContainer

@export var outliner: TowermodOutliner
@export var inspector: TowermodInspectorObject
@export var debug_toggle: BaseButton
@export var run_button: Button
@export var save_button: Button
@export var browse_button: Button
var data: CstcData :
	get: return Util.app_state.data


const InspectorObject = preload('res://inspector/inspector_object.gd')
const InspectorTowermod = preload('res://scenes/inspector_towermod.gd')

func _ready():
	Util.app_state_changed.connect(_on_app_state_changed)
	outliner.item_selected.connect(_on_outliner_item_selected)
	
	
	inspector.supply_custom_properties = InspectorTowermod.supply_custom_properties
	inspector.custom_get_control_for_property = InspectorTowermod.custom_get_control_for_property
	inspector.supply_custom_property_info = InspectorTowermod.supply_custom_property_info
	
	inspector.value_changed.connect(func(value):
		outliner.update_in_outliner(value)
	)

func _on_app_state_changed(prev_state: Util.AppState, state: Util.AppState):
	browse_button.disabled = !state.project
	run_button.disabled = !state.data
	save_button.disabled = !state.data
	if !is_same(state.data, prev_state.data):
		inspector.value = null
		outliner.load_outliner_data(state.data)

func _on_outliner_item_selected(selected_item):
	inspector.value = selected_item

func _on_save_button_pressed():
	Util.save_project()
	
func _on_run_button_pressed():
	if data:
		await Util.spin(Towermod.play_project(debug_toggle.button_pressed))
		Util.toast("Game launched...")


func _on_browse_button_pressed():
	OS.shell_open(Util.app_state.project.dir_path)
