
const InspectorNumeric = preload("inspector_numeric.gd")
const InspectorEnum = preload("inspector_enum.gd")
const InspectorPlaceholder = preload("inspector_placeholder.gd")
const InspectorObject = preload("inspector_object.gd")
const InspectorArray = preload("inspector_array.gd")
const InspectorDict = preload("inspector_dict.gd")
const InspectorString = preload("inspector_string.gd")
const InspectorBool = preload("inspector_bool.gd")
const InspectorFilePath = preload("inspector_file_path.gd")

## Returns an appropriate inspector instance for a given property info dict
static func get_control_for_property(value, pinfo: PropertyInfo) -> TowermodInspectorBase:
	# Show display text only for read-only value types
	if pinfo:
		if pinfo.usage & PROPERTY_USAGE_READ_ONLY:
			match pinfo.type:
				TYPE_OBJECT, TYPE_ARRAY, TYPE_DICTIONARY:
					pass
				_:
					return InspectorPlaceholder.new(value, pinfo)

		if pinfo.hint == PROPERTY_HINT_ENUM:
			return InspectorEnum.new(value, pinfo)
		elif (
			(
				pinfo.hint == PROPERTY_HINT_GLOBAL_FILE
				or pinfo.hint == PROPERTY_HINT_FILE
				or pinfo.hint == PROPERTY_HINT_DIR
				or pinfo.hint == PROPERTY_HINT_GLOBAL_DIR
			)
			and pinfo.type == TYPE_STRING
		):
			return InspectorFilePath.new(value, pinfo)
	var type = pinfo.type if pinfo else typeof(value)
	match type:
		TYPE_BOOL:
			return InspectorBool.new(value, pinfo)
		TYPE_STRING:
			return InspectorString.new(value, pinfo)
		TYPE_FLOAT, TYPE_INT:
			return InspectorNumeric.new(value, pinfo)
		TYPE_ARRAY:
			return InspectorArray.new(value, pinfo)
		TYPE_DICTIONARY:
			return InspectorDict.new(value, pinfo)
		TYPE_OBJECT:
			return InspectorObject.new(value, pinfo)
	return InspectorPlaceholder.new(value, pinfo)

static func get_dictionary_property_infos(obj: Dictionary, obj_pinfo: PropertyInfo, supply_custom_property_info: Callable) -> Array:
	return obj.keys().map(
		func(key):
			var property_info = { name = key, type = typeof(obj[key]), parent = obj_pinfo }
			# if type matches one of the of one propertyinfos in the dict's 'values' propertyinfo, apply hints/usage from there
			for value_pinfo in obj_pinfo.values:
				if value_pinfo.type == property_info.type:
					PropertyInfo.merge(property_info, value_pinfo)
			var out = _apply_custom_property_info(obj, property_info, supply_custom_property_info)
			var map_value_in = out[0]
			var map_value_out = out[1]
			return [PropertyInfo.new(property_info), map_value_in, map_value_out]
	)
	
static func get_array_property_infos(obj: Array, obj_pinfo: PropertyInfo, supply_custom_property_info: Callable) -> Array:
	return Util.enumerate(obj).map(
		func(el1):
			var i = el1[0]
			var element = el1[1]
			var property_info = { name = str(i), type = typeof(element), parent = obj_pinfo }
			# if type matches one of the of one propertyinfos in the array's 'values' propertyinfo, apply hints/usage from there
			for value_pinfo in obj_pinfo.values:
				if value_pinfo.type == property_info.type:
					PropertyInfo.merge(property_info, value_pinfo)
			var out = _apply_custom_property_info(obj, property_info, supply_custom_property_info)
			var map_value_in = out[0]
			var map_value_out = out[1]
			return [PropertyInfo.new(property_info), map_value_in, map_value_out]
	)

static func get_property_info_from_value(value) -> PropertyInfo:
	var p = {
		type = typeof(value),
	}
	if p['type'] == TYPE_OBJECT:
		p['class_name'] = value.get_class()
	return PropertyInfo.new(p)
	
## Wrapper around `get_property_list()` that converts the dictionaries to PropertyInfos
## and adds custom property metadata which objects can expose using a `custom_property_info()` method
static func get_object_property_infos(obj: Object, obj_pinfo: PropertyInfo, supply_custom_property_info: Callable, supply_custom_properties: Callable) -> Array:
	var property_list: Array[Dictionary] = obj.get_property_list()
	if supply_custom_properties.is_valid():
		property_list.append_array(supply_custom_properties.call(obj).map(func(pinfo):
			# fill in defaults.
			var p = get_property_info_from_value(pinfo.getter.call()).to_dict()
			p.merge(pinfo, true)
			return p
		))
	
	return property_list.map(
		func(property_info):
			property_info[&'parent'] = obj_pinfo

			# Custom property info supplied by object implementation
			if obj.has_method('custom_property_info'):
				property_info.merge(obj.custom_property_info(str(property_info['name'])), true)
				
			# Custom property info supplied via `supply_custom_property_info`
			var out = _apply_custom_property_info(obj, property_info, supply_custom_property_info)
			var map_value_in = out[0]
			var map_value_out = out[1]
			if 'getter' in property_info:
				# If custom property has a getter but no setter, indicate "read-only"
				if not 'setter' in property_info:
					property_info['usage'] = property_info.get('usage', 0) | PROPERTY_USAGE_READ_ONLY
			elif !obj.has_method("set_%s" % [property_info['name']]):
				# Indicate "read-only" in usage flags if no setter function exists
				property_info['usage'] = property_info['usage'] | PROPERTY_USAGE_READ_ONLY
			return [PropertyInfo.new(property_info), map_value_in, map_value_out]
	)
static func _apply_custom_property_info(obj, property_info, supply_custom_property_info):
	var map_value_in = null
	var map_value_out = null
	if supply_custom_property_info and not (property_info.get(&'usage', PROPERTY_USAGE_NONE) & (PROPERTY_USAGE_CATEGORY | PROPERTY_USAGE_SUBGROUP | PROPERTY_USAGE_GROUP)):
		var initial_value
		if obj is Array:
			var i = int(property_info[&'name'])
			initial_value = obj[i]
		else:
			if 'value' in property_info:
				initial_value = property_info['value']
			else:
				initial_value = obj.get(property_info[&'name'])
		# Custom property info supplied via inspector customizations
		var output = supply_custom_property_info.call(obj, property_info)
		if output:
			var custom_property_info = null
			if output is Dictionary:
				# if supply_custom_property_info returns a Dictionary, that is the custom property info
				custom_property_info = output
			else:
				# if supply_custom_property_info returns a tuple
				# it contains two mapping functions
				# and the map_value_in function returns a tuple containing both the math value and computed property info
				map_value_in = output[0]
				map_value_out = output[1]
				# call mapping function to get the computed custom property info that it provides
				var result = map_value_in.call(initial_value, property_info)
				if result:
					custom_property_info = result[1]
			if custom_property_info:
				property_info.merge(custom_property_info, true)
	return [map_value_in, map_value_out]
	
