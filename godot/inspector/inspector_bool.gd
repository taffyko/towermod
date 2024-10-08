extends "inspector_base.gd"

func on_set_value(_new_value):
	$Checkbox.button_pressed = value

func repopulate_ui():
	clear_children()
	var control = CheckBox.new()
	control.toggled.connect(set_value_and_emit)
	control.name = &"CheckBox"
	control.button_pressed = value
	add_child(control)
