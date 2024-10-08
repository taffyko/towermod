extends "inspector_base.gd"

var index_value_map
var value_index_map
var pinfo

func on_set_value(_new_value):
	$OptionButton.value = value_index_map[value]

func repopulate_ui():
	clear_children()
	index_value_map = {}
	value_index_map = {}
	var control := OptionButton.new()
	control.name = &"OptionButton"
	# Build dropdown items from enum hint string
	var item_idx = 0
	for hint_entry in pinfo.hint_string.split(','):
		var name = hint_entry
		var val = item_idx
		if ':' in hint_entry:
			var split = hint_entry.split(':')
			name = split[0]
			val = int(split[1])
		control.add_item(name, item_idx)
		if pinfo.type == TYPE_STRING:
			value_index_map[name] = item_idx
			index_value_map[item_idx] = name
		else:
			value_index_map[val] = item_idx
			index_value_map[item_idx] = val
		item_idx = item_idx + 1
	control.select(value_index_map[value])
	control.item_selected.connect(
		func(new_idx):
			set_value_and_emit(index_value_map[new_idx])
	)
	add_child(control)
	

func _init(value, pinfo):
	super(value, pinfo)
	self.pinfo = pinfo
