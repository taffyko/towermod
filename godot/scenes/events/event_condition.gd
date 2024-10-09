extends Node
const EventUtil = preload("./event_util.gd")
var data: CstcEventCondition :
	set(v):
		data = v
		if is_node_ready():
			repopulate_children()

@export var label: Label

func _ready():
	data = data

func repopulate_children():
	label.text = "%s:%s - %s" % [data.plugin_data.string_table.name, data.cond_id, data.cond_info.ace_display_text]
