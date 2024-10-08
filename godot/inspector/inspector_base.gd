extends MarginContainer
class_name TowermodInspectorBase

## The root value that controls will be populated from
var value: set = set_value, get = get_value
## Backing value, used to bypass setter internally when updating from UI
var _value

## When the value is a property of a larger object, this holds its property info
var property_info: PropertyInfo
var initialized_with_property_info := false

## Whether a given control implementation should be indented beneath its label
## rather than side-by-side
func should_indent():
	return false

## Can be set externally.
## Can contribute custom read-only computed properties which appear alongside the others.
## Only applied to objects.
## Signature:
## - (Object) -> Array[Dictionary] (array of PropertyInfo dicts)
@export var supply_custom_properties: Callable

## Can be set externally, overrides the default behavior of `InspectorUtil.get_object_property_infos`
## and is also used to provide custom mapping functions to apply when reading/writing the value.
## These overrides are also propagated to descendant controls.
## Signatures: 
## - (Object, base_pinfo: Dictionary) -> Dictionary
## - (Object, base_pinfo: Dictionary) -> [map_value_in, map_value_out]
@export var supply_custom_property_info: Callable
##  Called to transform the value when writing via `value`.
##  Also called with the initial value in order to get custom property info.
##  Signature: (value: TOuter, base_pinfo: Dictionary) -> [TInner, Dictionary]
var _map_value_in: Callable
##  Called to transform the value when reading via `value`.
##  Signature: (value: TInner) -> TOuter
var _map_value_out: Callable

## Can be set externally. When it returns a Node, this overrides the default behavior of `InspectorUtil.get_control_for_property`.
## These overrides are also propagated to descendant controls.
## Signature: (Object, value: T, PropertyInfo) -> Node | null
@export var custom_get_control_for_property: Callable

func map_value_in(new_value):
	if _map_value_in:
		var result = _map_value_in.call(new_value)
		if result:
			return result[0]
	return new_value
func map_value_out(new_value):
	if _map_value_out:
		var result = _map_value_out.call(new_value)
		if result != null:
			return result
	return new_value


## Fires when user interaction changed this value (including mutations (e.g. properties of this object) that bubble up from child controls)
signal value_changed

## Recursively regenerate UI controls (Called on `_ready()`)
## Some controls (lists) may choose to add/remove UI controls in internal piecemeal updates,
## but this method will always regenerate everything from scratch
func repopulate_ui():
	pass

## Setter used when setting the value externally
## (This is also called to set the initial value _before_ the node is ready) 
func set_value(new_value):
	_value = map_value_in(new_value)
	if is_node_ready():
		on_set_value(_value)
func get_value():
	return _value


## Overridden by subclasses to propagate subsequent value changes to the UI controls
## Sometimes, value changes may cause the UI to repopulate (e.g. type changed on a dynamically typed control).
func on_set_value(_new_value):
	pass
	
# Recursively generate UI as soon as the node enters the tree
func _ready():
	set(&"theme_override_constants/margin_left", 0)
	set(&"theme_override_constants/margin_top", 0)
	set(&"theme_override_constants/margin_right", 0)
	set(&"theme_override_constants/margin_bottom", 0)
	repopulate_ui()

# Constructor
func _init(init_value = null, pinfo = {}):
	if pinfo:
		initialized_with_property_info = true
	if pinfo is PropertyInfo:
		property_info = pinfo
	elif pinfo and !pinfo.is_empty():
		property_info = PropertyInfo.new(pinfo)
	set_value(init_value)

# Helpers

func clear_children():
	for child in get_children():
		child.queue_free()

## Nice for tersely connecting signal value update to inner controls
## Does not trigger on_set_value(), which is only for externally-triggered value changes
func set_value_and_emit(new_value):
	_value = new_value
	self.value_changed.emit(new_value)
	
