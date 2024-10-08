extends "inspector_base.gd"
## Potential entry point for an inspector UI
## Preferences that effect the behavior of the whole inspector should be set here
class_name TowermodInspectorObject
const InspectorUtil = preload('inspector_util.gd')
const Heading = preload("heading.gd")

func should_indent():
	return true

func on_set_value(_new_value):
	if not initialized_with_property_info:
		property_info = InspectorUtil.get_property_info_from_value(value)
	# Recursively generate UI whenever a new object is set
	repopulate_ui()

func repopulate_ui():
	clear_children()
	var vbox = AlignmentContainer.new()
	add_child(vbox)
	if value == null:
		vbox.add_child(InspectorUtil.InspectorPlaceholder.new())
	else:
		for output in InspectorUtil.get_object_property_infos(value, property_info, supply_custom_property_info, supply_custom_properties):
			var pinfo = output[0]
			var map_in = output[1]
			var map_out = output[2]
			
			# Ignore category labels
			if pinfo.usage & (PROPERTY_USAGE_CATEGORY | PROPERTY_USAGE_SUBGROUP | PROPERTY_USAGE_GROUP):
				continue
			if pinfo.hidden:
				continue
			if pinfo.name == &"script":
				continue
			
			var prop_value
			if pinfo.getter:
				prop_value = pinfo.getter.call()
			else:
				prop_value = self.value.get(pinfo.name)
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
				if pinfo.setter:
					pinfo.setter.call(new_value)
				else:
					value.set(pinfo.name, control.map_value_out(new_value))
				if value == self.value:
					value_changed.emit(value)
			)
			
			# Lay out properties in nice label/control hboxes
			var heading = Heading.new(control, pinfo.name)
			vbox.add_child(heading)
