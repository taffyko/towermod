extends "inspector_base.gd"
const InspectorUtil = preload('inspector_util.gd')
const Heading = preload("heading.gd")

func should_indent():
	return true
	
func on_set_value(_new_value):
	# Recursively generate UI whenever a new object is set
	repopulate_ui()

func repopulate_ui():
	clear_children()
	var vbox = AlignmentContainer.new()
	add_child(vbox)
	if value == null:
		vbox.add_child(InspectorUtil.InspectorPlaceholder.new())
	else:
		var i = 0
		var read_only = !!(property_info.usage & PROPERTY_USAGE_READ_ONLY)
		for output in InspectorUtil.get_array_property_infos(value, property_info, supply_custom_property_info):
			var pinfo = output[0]
			# var map_in = output[1]
			# var map_out = output[2]
			var element = self.value[i]
			
			# Generate the control for this property
			var control = null
			if custom_get_control_for_property:
				control = custom_get_control_for_property.call(self.value, element, pinfo)
			if not control:
				control = InspectorUtil.get_control_for_property(element, pinfo)
			
			# Propagate overrides to child controls
			control.custom_get_control_for_property = self.custom_get_control_for_property
			control.supply_custom_property_info = self.supply_custom_property_info
			control.supply_custom_properties = self.supply_custom_properties
			
			var value = self.value
			control.value_changed.connect(func(new_value):
				value[i] = control.map_value_out(new_value)
				if value == self.value:
					value_changed.emit(value)
			)
			
			var heading = Heading.new(control, str(i), !read_only)
			heading.remove_pressed.connect(func():
				if value: value.remove_at(i)
				value_changed.emit(value)
				# need to repopulate UI otherwise bound indices will become wrong
				repopulate_ui()
			)
			vbox.add_child(heading)
			i += 1
			
		if !read_only:
			var hbox = HBoxContainer.new()
			
			var option_button := OptionButton.new()
			for value_pinfo in property_info.values:
				option_button.add_item(Util.variant_name_by_type(value_pinfo.type))
				option_button.set_item_metadata(option_button.item_count - 1, value_pinfo)
				option_button.select(0)
			if option_button.item_count <= 1:
				option_button.visible = false
			
			var add_button = Button.new()
			add_button.text = "+"
			add_button.size_flags_horizontal = SIZE_EXPAND_FILL
			add_button.pressed.connect(func():
				var value_pinfo = option_button.get_selected_metadata()
				if value_pinfo:
					value.push_back(Util.default(value_pinfo))
				else:
					value.push_back(null)
				value_changed.emit(value)
				repopulate_ui()
			)
			
			hbox.add_child(add_button)
			hbox.add_child(option_button)
			vbox.add_child(hbox)
