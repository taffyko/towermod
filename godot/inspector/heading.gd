## UI for an entry in a list of controls (object property, array element, dictionary key-value pair)
extends AlignmentRow

var parented := false
var control: TowermodInspectorBase
var removable := false
var text: String

signal remove_pressed

func _init(control: TowermodInspectorBase, text: String, removable := false):
	self.control = control
	self.text = text
	self.removable = removable

func _ready():
	var prop_label = Label.new()
	prop_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	prop_label.vertical_alignment = VERTICAL_ALIGNMENT_TOP
	prop_label.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	prop_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	
	prop_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	prop_label.mouse_filter = Control.MOUSE_FILTER_PASS
	prop_label.text = text
	prop_label.tooltip_text = text
	
	var header = HBoxContainer.new()
	add_child(header)

	var remove_button
	if removable:
		remove_button = Button.new()
		remove_button.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
		remove_button.custom_minimum_size.x = 16
		remove_button.text = "X"
		remove_button.pressed.connect(_on_remove_button_pressed)
	
	if control.should_indent():
		## If control.should_indent() is true, place the control beneath a collapsible dropdown
		var toggle_collapse_button = Button.new()
		toggle_collapse_button.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
		toggle_collapse_button.toggle_mode = true
		toggle_collapse_button.custom_minimum_size.x = 16
		if removable: header.add_child(remove_button)
		header.add_child(prop_label)
		header.add_child(toggle_collapse_button)
		
		var indent_container = MarginContainer.new()
		indent_container.set(&"theme_override_constants/margin_left", 16)
		indent_container.set(&"theme_override_constants/margin_top", 0)
		indent_container.set(&"theme_override_constants/margin_right", 0)
		indent_container.set(&"theme_override_constants/margin_bottom", 0)
		indent_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		add_child(indent_container)
		
		var on_collapse_toggled = func(toggled_on: bool):
			indent_container.visible = toggled_on
			toggle_collapse_button.text = "V" if toggled_on else ">"
			if toggled_on and !parented:
				# Lazily add control to scene when the dropdown is first expanded
				indent_container.add_child(control)
				parented = true
		toggle_collapse_button.toggled.connect(on_collapse_toggled)
		on_collapse_toggled.call(false)
	else:
		## If control.should_indent() is false, render the label and control inline
		header.add_child(prop_label)
		if removable: header.add_child(remove_button)
		add_child(control)

func _on_remove_button_pressed():
	remove_pressed.emit()
