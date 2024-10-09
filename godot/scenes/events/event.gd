extends Node

var data: CstcEvent :
	set(v):
		data = v
		if is_node_ready():
			repopulate_children()

@export var conditions_container: VBoxContainer
@export var actions_container: VBoxContainer
@export var events_container: VBoxContainer

const EventUtil = preload("./event_util.gd")

func _ready():
	data = data

func repopulate_children():
	Util.clear_children(conditions_container)
	Util.clear_children(actions_container)
	Util.clear_children(events_container)
	if data:
		for action in data.actions:
			actions_container.add_child(EventUtil.node_for_element(action))
		for condition in data.conditions:
			conditions_container.add_child(EventUtil.node_for_element(condition))
		for event in data.events:
			events_container.add_child(EventUtil.node_for_element(event))
