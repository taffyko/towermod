extends "inspector_base.gd"
## Potential entry point for an inspector UI
## Preferences that effect the behavior of the whole inspector should be set here
class_name TowermodInspectorDict
const InspectorUtil = preload('inspector_util.gd')
const Heading = preload("heading.gd")

@export var fixed_keys: bool = false

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
	elif value is Dictionary:
		var read_only = !!(property_info.usage & PROPERTY_USAGE_READ_ONLY)
		for output in InspectorUtil.get_dictionary_property_infos(value, property_info, supply_custom_property_info):
			var pinfo = output[0]
			var map_in = output[1]
			var map_out = output[2]
			var key = '' if is_same(pinfo.name, &'') else pinfo.name # &'' fails for dict access
			
			if pinfo.usage & (PROPERTY_USAGE_CATEGORY | PROPERTY_USAGE_SUBGROUP | PROPERTY_USAGE_GROUP):
				continue
			if pinfo.hidden:
				continue
			var prop_value = self.value[key]
			if map_in:
				var result = map_in.call(prop_value, pinfo)
				if result != null:
					prop_value = result[0]

			# Generate the control for this property
			var control = null
			if custom_get_control_for_property:
				control = custom_get_control_for_property.call(self.value, prop_value, pinfo)
			if not control:
				control = InspectorUtil.get_control_for_property(prop_value, pinfo)
			
			# Propagate overrides to child controls
			control.custom_get_control_for_property = self.custom_get_control_for_property
			control.supply_custom_property_info = self.supply_custom_property_info
			control.supply_custom_properties = self.supply_custom_properties
			if map_in: control._map_value_in = map_in
			if map_out: control._map_value_out = map_out
			
			# Assign object to local variable before capturing so that the GDScript closure captures by value instead of member reference.
			# Otherwise, the following situation can occur:
			# - A control for an object property is edited, but the "value_changed" event hasn't fired yet because it is still focused
			# - A user clicks a button to switch the inspector to a different object.
			#   1. `self.value` of this control changes to the new object.
			#   2. Focus leaves the child control due to user action, triggering the "value_changed" event on the property of the previous object.
			#      - Event handler here reflects the changed property on `self.value`
			#        which now refers to the *new object*, not the one the property belonged to.
			var value = self.value
			control.value_changed.connect(func(new_value):
				value[key] = control.map_value_out(new_value)
				if value == self.value:
					value_changed.emit(value)
			)
			
			var heading = Heading.new(control, key, !(fixed_keys or read_only))
			heading.remove_pressed.connect(func():
				if value: value.erase(key)
				heading.queue_free()
			)
			vbox.add_child(heading)

		if !(fixed_keys or read_only):
			var hbox = HBoxContainer.new()
			
			var option_button := OptionButton.new()
			for value_pinfo in property_info.values:
				option_button.add_item(Util.variant_name_by_type(value_pinfo.type))
				option_button.set_item_metadata(option_button.item_count - 1, value_pinfo)
				option_button.select(0)
			if option_button.item_count <= 1:
				option_button.visible = false

			var add_line := LineEdit.new()
			add_line.size_flags_horizontal = SIZE_EXPAND_FILL
			add_line.placeholder_text = "Add"
			add_line.text_submitted.connect(func(text):
				var value_pinfo = option_button.get_selected_metadata()
				if value_pinfo:
					value[text] = Util.default(value_pinfo)
				else:
					value[text] = null
				repopulate_ui()
			)

			hbox.add_child(add_line)
			hbox.add_child(option_button)
			vbox.add_child(hbox)
