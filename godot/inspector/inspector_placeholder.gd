extends "inspector_base.gd"

func repopulate_ui():
	clear_children()
	var control = Label.new()
	control.text = str(value)
	control.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	add_child(control)
