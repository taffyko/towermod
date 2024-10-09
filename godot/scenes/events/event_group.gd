extends Control
const EventUtil = preload("./event_util.gd")
var data: CstcEventGroup :
	set(v):
		data = v
		if is_node_ready():
			repopulate_children()

@export var label: Label
@export var events_container: VBoxContainer

func _ready():
	data = data
	Util.clear_children(events_container)
	for event in data.events:
		events_container.add_child(EventUtil.node_for_element(event))

func repopulate_children():
	label.text = str(data.name)
