## Takes a custom callback which drives generation of UI controls
extends "inspector_base.gd"
class_name TowermodInspectorCustom

var override: Callable

func _init(init_value = null, pinfo = {}, override: Callable = func(_node): pass):
	super(init_value, pinfo)
	self.override = override

func repopulate_ui():
	clear_children()
	override.call(self)
