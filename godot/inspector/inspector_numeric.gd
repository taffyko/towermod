extends "inspector_base.gd"

var is_float := false:
	set(new_is_float):
		if is_float != new_is_float:
			is_float = new_is_float
			if is_node_ready():
				repopulate_ui()

func on_set_value(new_value):
	is_float = typeof(new_value) == TYPE_FLOAT
	$SpinBox.value = value

func _ready():
	super()
	on_set_value(value)

func repopulate_ui():
	clear_children()
	var control = numeric_edit(value, is_float)
	control.value_changed.connect(func(new_value):
		if is_float:
			set_value_and_emit(float(new_value))
		else:
			set_value_and_emit(int(new_value))
	)
	add_child(control)

static func numeric_edit(value, is_float = null) -> SpinBox:
	if is_float == null:
		is_float = typeof(value) == TYPE_FLOAT
	var control = SpinBox.new()
	control.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	control.allow_greater = true
	control.allow_lesser = true
	if is_float:
		control.step = 0.0000001
		control.custom_arrow_step = 0.1
		control.rounded = false
	control.name = &"SpinBox"
	control.value = value
	return control
	
