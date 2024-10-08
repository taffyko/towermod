extends "inspector_base.gd"

func on_set_value(new_value):
	if control:
		control.text = new_value
var control: LineEdit

func repopulate_ui():
	clear_children()
	var hbox = HBoxContainer.new()
	var browse = Button.new()
	browse.text = "Browse"
	control = LineEdit.new()
	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	control.text_changed.connect(set_value_and_emit)
	control.name = &"LineEdit"
	control.text = value
	hbox.add_child(browse)
	hbox.add_child(control)
	
	var modal = FileDialog.new()
	modal.use_native_dialog = true
	modal.access = FileDialog.ACCESS_FILESYSTEM
	modal.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	modal.add_filter("*.exe", "Executable")
	modal.add_filter("*.*", "Any file")
	modal.file_selected.connect(func(path):
		set_value_and_emit(path)
		on_set_value(path)
	)
	
	browse.pressed.connect(func():
		modal.visible = true
	)
	
	add_child(hbox)
	add_child(modal)
