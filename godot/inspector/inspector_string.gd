extends "inspector_base.gd"

func on_set_value(_new_value):
	$LineEdit.text = value

func repopulate_ui():
	clear_children()
	var control = LineEdit.new()
	control.text_changed.connect(set_value_and_emit)
	control.name = &"LineEdit"
	control.text = value
	add_child(control)
