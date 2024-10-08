## A type for representing the data found in dictionaries returned by `get_property_list()`
## (plus custom property metadata)
extends RefCounted
class_name PropertyInfo

var name: StringName
var classname: StringName
var type: Variant.Type
var hint: PropertyHint
var hint_string: String
var usage: PropertyUsageFlags

# Custom fields

## Hide
var hidden: bool
## For collections, a list of PropertyInfo describing each valid value and how it should be displayed
## (a superset of what can be described by the PropertyHint.PROPERTY_HINT_ARRAY_TYPE hint string)
var values: Array[PropertyInfo]
var parent: PropertyInfo

## Getter, for computed properties
var getter: Callable
## Setter, for computed properties
var setter: Callable

func _init(property_info: Dictionary):
	name = property_info.get(&'name', &"")
	classname = property_info.get(&'class_name', property_info.get(&"classname", &''))
	type = property_info.get(&'type', TYPE_NIL)
	hint = property_info.get(&'hint', PROPERTY_HINT_NONE)
	hint_string = property_info.get(&'hint_string', "")
	usage = property_info.get(&'usage', PROPERTY_USAGE_DEFAULT)
	# custom
	hidden = property_info.get(&'hidden', false)
	parent = property_info.get(&'parent', null)
	setter = property_info.get(&'setter', Callable())
	getter = property_info.get(&'getter', Callable())
	var value_dicts = property_info.get(&'values', [])
	
	for value_dict in value_dicts:
		if value_dict is PropertyInfo:
			values.append(value_dict)
		else:
			values.append(PropertyInfo.new(value_dict))
	# If not given explicitly, may populate values from PROPERTY_HINT_ARRAY_TYPE hint string
	if len(values) == 0 and (hint == PROPERTY_HINT_ARRAY_TYPE or hint == PROPERTY_HINT_TYPE_STRING):
		# Example: $"{TYPE_INT}/{PROPERTY_HINT_ENUM}:Zero,One,Two"
		# Syntax: [arrayType:...]elemType[/elemHint:[elemHintString]]
		# - $"{TYPE_INT}" would be an array of integers
		# - $"{TYPE_ARRAY:TYPE_INT}" would be an array of arrays of integers
		# - $"{TYPE_ARRAY:TYPE_ARRAY:TYPE_INT}" would be an array of arrays of arrays of integers
		var split1 = hint_string.split("/")
		var split_hint = split1[1].split(":") if len(split1) > 1 else PackedStringArray()
		var dimension_types = split1[0].split(":")
		# TODO: nested array types
		var elem_classname = &""
		var elem_type = int(dimension_types[0]) # may be an integer like the value of TYPE_INT
		if elem_type == 0:
			elem_type = Util.variant_type_by_name(dimension_types[0]) # but may also be a type string like "int" or "RefCounted"
			if elem_type == TYPE_OBJECT:
				elem_classname = dimension_types[0]
		var elem_hint = int(split_hint[0]) if len(split_hint) > 0 else PROPERTY_HINT_NONE
		var elem_hint_string = split_hint[1] if len(split_hint) > 1 else ""
		
		values.append(PropertyInfo.new({
			type = elem_type,
			hint = elem_hint,
			hint_string = elem_hint_string,
			classname = elem_classname,
			parent = self,
		}))


# shim to allow pinfo[&'class_name'] on a PropertyInfo instance
func _get_property_list():
	return [{
		name = &'class_name',
		type = TYPE_STRING_NAME,
		usage = PROPERTY_USAGE_DEFAULT,
		hint = PROPERTY_HINT_NONE
	}]
func _get(property):
	if property == &'class_name':
		return self.classname
func _set(property, value):
	if property == &'class_name':
		self.classname = value

func to_dict() -> Dictionary:
	var dict = {
		name = self.name,
		type = self.type,
		hint = self.hint,
		hint_string = self.hint_string,
		usage = self.usage,
		hidden = self.hidden,
		values = self.values,
		parent = self.parent,
	}
	dict[&'class_name'] = self.class_name
	return dict
static func merge(target, source):
	var is_dict := source is Dictionary
	var type = source.get(&'type', TYPE_NIL) if is_dict else source.type
	if type:
		target[&'type'] = type
		
	var name = source.get(&'name', false) if is_dict else source.name
	if name:
		target.set(&'', type)
		target[&'name'] = name
		
	var classname = source.get(&'classname', false) if is_dict else source.classname
	if classname:
		target[&'classname'] = classname
		
	var hint = source.get(&'hint', false) if is_dict else source.hint
	if hint:
		target[&'hint'] = hint
		
	var hint_string = source.get(&'hint_string', "") if is_dict else source.hint_string
	if hint_string:
		target[&'hint_string'] = hint_string
	
	var usage = source.get(&'usage', PROPERTY_USAGE_NONE) if is_dict else source.usage
	if usage is int:
		target[&'usage'] = target.get(&'usage', PROPERTY_HINT_NONE) | usage
	
	var values = source.get(&'values', []) if is_dict else source.values
	if values:
		target[&'values'] = values
		
	var parent = source.get(&'parent', null) if is_dict else source.parent
	if parent:
		target[&'parent'] = parent
		
	var hidden = source.get(&'hidden', null) if is_dict else source.hidden 
	if hidden != null:
		target[&'hidden'] = hidden


	var setter = source.get(&'setter', Callable()) if is_dict else source.setter 
	if setter:
		target[&'setter'] = setter

	var getter = source.get(&'getter', Callable()) if is_dict else source.getter 
	if getter:
		target[&'getter'] = getter
