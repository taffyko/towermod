extends PanelContainer

@export var events_container: Control

const EventUtil = preload("res://scenes/events/event_util.gd")

var event_sheet: CstcEventSheet

var pending_update = false :
	set(v):
		pending_update = v
		if visible:
			repopulate_children()

func _ready():
	if OS.has_feature("debug"):
		Util.app_state_changed.connect(_on_app_state_changed)

func _input(event):
	if Input.is_action_just_pressed("ui_cancel"):
		if OS.has_feature("debug"):
			pending_update = true

func _on_app_state_changed(prev_state: Util.AppState, state: Util.AppState):
	if !is_same(state.data, prev_state.data):
		event_sheet = null
		if state.data != null:
			event_sheet = state.data.event_block.layout_sheets.front()
			pending_update = true

func _on_main_tab_switched(new_tab_name: String):
	if new_tab_name == name and pending_update:
		repopulate_children()
		
func repopulate_children():
	Util.clear_children(events_container)
	if event_sheet:
		for event in event_sheet.events:
			events_container.add_child(EventUtil.node_for_element(event))

