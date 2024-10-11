extends Control
class_name TowermodOutliner

const InspectorTowermod = preload("res://scenes/inspector_towermod.gd")

@export var tree: Tree
@export var searchbar: LineEdit
@export var history_prev_button: Button
@export var history_next_button: Button

@export var search_settings: MenuButton
@export var data_filter: MenuButton

var treeitem_data_map := {}
var data_treeitem_map := {}

const max_history = 5
var history: Array[Object] = []
var history_idx := -1

func history_next():
	if history_idx < len(history) - 1:
		history_idx += 1
		set_selected_item(history[history_idx])
func history_prev():
	if history_idx > 0:
		history_idx -= 1
		set_selected_item(history[history_idx])

func set_selected_item(obj: Object):
	var tree_item = data_treeitem_map.get(obj)
	if is_instance_valid(tree_item):
		tree.set_selected(tree_item, 0)
		jump_to_item(tree_item)
		tree.queue_redraw()
		return true
	else:
		data_treeitem_map.erase(obj)
		treeitem_data_map.erase(tree_item)
		return false

signal item_selected(item)

func _ready():
	InspectorTowermod.initialize(self)

func get_selected_item() -> Object:
	return treeitem_data_map.get(tree.get_selected())
func jump_to_item(item: TreeItem):
	if not is_instance_valid(item):
		return
	if not item.visible:
		_on_search_bar_text_changed("")
	var parent = item
	while parent:
		parent.collapsed = false
		parent = parent.get_parent()
	tree.scroll_to_item(item, true)

func make_group(text: String) -> TreeItem:
	var treeitem_parent := tree.get_root().create_child()
	treeitem_parent.set_text(0, text)
	return treeitem_parent
func make_item(parent: TreeItem, data: Object, text: String = "") -> TreeItem:
	var item = parent.create_child()
	treeitem_data_map[item] = data
	data_treeitem_map[data] = item
	return item

func apply_filter(treeitem: TreeItem, predicate: Callable) -> bool:
	var data: Object = treeitem_data_map.get(treeitem)
	var visible: bool = predicate.call(data)
	for child in treeitem.get_children():
		if apply_filter(child, predicate):
			# If at least one child is visible, this one shall be as well
			visible = true
	if treeitem.visible != visible:
		treeitem.set.bind(&'visible', visible).call_deferred()
	return visible

func _input(_event):
	if Input.is_action_just_pressed("ui_cancel"):
		if OS.has_feature("debug"):
			load_outliner_data(Util.app_state.data)

func load_outliner_data(data: CstcData):
	var tree_parent: Node = tree.get_parent()
	if !tree_parent:
		return
	tree_parent.remove_child(tree)
	await Promise.from(func(reject):
		var start_time = Util.time_now()
		print("Building outliner data... ")

		# Free existing tree items
		self.tree.clear()
		self.treeitem_data_map = {}
		self.data_treeitem_map = {}
		if !data:
			return
		var treeitem_root := tree.create_item()

		var treeitem_parent := make_group("Layouts")
		for idx in range(len(data.layouts)):
			var layout = data.layouts[idx]
			var treeitem_layout := make_item(treeitem_parent, layout)
			for layer in layout.layers:
				var treeitem_layer := make_item(treeitem_layout, layer)
				for object in layer.objects:
					var item = make_item(treeitem_layer, object)

		treeitem_parent = make_group("Animations")
		make_animations(treeitem_parent, data.animations)

		treeitem_parent = make_group("Behaviors")
		for idx in range(len(data.behaviors)):
			var behavior = data.behaviors[idx]
			var object_type = data.get_object_type(behavior.object_type_id)
			make_item(treeitem_parent, behavior)

		treeitem_parent = make_group("Containers")
		for idx in range(len(data.containers)):
			var container = data.containers[idx]
			var item = make_item(treeitem_parent, container)

		treeitem_parent = make_group("Families")
		for idx in range(len(data.families)):
			var family = data.families[idx]
			make_item(treeitem_parent, family)

		treeitem_parent = make_group("Object Types")
		for object_type in data.object_types.values():
			make_item(treeitem_parent, object_type)

		treeitem_parent = make_group("Traits")
		for idx in range(len(data.traits)):
			var object_trait = data.traits[idx]
			make_item(treeitem_parent, object_trait)

		make_item(treeitem_root, data.app_block, "Project Settings")

		treeitem_root.set_collapsed_recursive(true)
		treeitem_root.set_collapsed(false)
		update_all_items()
		print("Done building outliner data: ", Util.time_since(start_time))
	)
	tree_parent.add_child(tree)

func update_all_items():
	for data in data_treeitem_map.keys():
		update_in_outliner(data)

func update_in_outliner(data):
	var item: TreeItem = data_treeitem_map.get(data)
	if !item:
		return # TODO add new items without rebuilding whole tree
	var text: String
	if data is CstcObjectTrait:
		text = "Trait: %s" % [data.name]
	elif data is CstcObjectContainer:
		var first_obj_type_id = data.object_ids.front()
		var first_obj = Util.data.get_object_type(first_obj_type_id) if first_obj_type_id != null else null
		if first_obj != null:
			text = "Container: %s" % [first_obj.name]
		else:
			text = "Container: (???)"
		pass
	elif data is CstcBehavior:
		var object_type = Util.data.get_object_type(data.object_type_id)
		text = "Behavior (%s): %s" % [object_type.name, data.name]
	elif data is CstcAnimation:
		if data.name == "Animation" and !data.is_angle:
			text = "Animation set %s" % data.id
		elif data.name == "Animation":
			text = "Animation %s" % data.id
		else:
			text = "Animation %s: %s" % [data.id, data.name]
		var frame_count := len(data.frames)
		if frame_count > 0:
			text = "%s (%s frame%s)" % [text, frame_count, "s" if frame_count > 1 else ""]
	elif data is CstcFamily:
		text = "Family: %s" % [data.name]
	elif data is CstcLayout:
		text = "Layout: %s" % [data.name]
	elif data is CstcLayoutLayer:
		text = "Layer %s: %s" % [data.id, data.name]
	elif data is CstcObjectInstance:
		var object_type = Util.data.get_object_type(data.object_type_id)
		text = "Instance %s: (%s: %s)" % [object_type.get_plugin_name(), object_type.name, data.id]
	elif data is CstcObjectType:
		text = "Type %s: (%s: %s)" % [data.id, data.get_plugin_name(), data.name]
	elif data is CstcAppBlock:
		text = "Project Settings"
	# FIXME use images on-disk
	var icon = InspectorTowermod.get_cstc_icon(data)
	if icon:
		item.set_icon.call_deferred(0, icon)
	if text:
		item.set_text.call_deferred(0, text)

func make_animations(parent, animations, depth = 0):
	for animation in animations:
		var item := make_item(parent, animation)
		make_animations(item, animation.sub_animations, depth + 1)

func make_events(parent, events):
	var item_name
	for event in events:
		if event is CstcEvent:
			item_name = "Event (%s)" % [event.sheet_id]
			var item := make_item(parent, event, item_name)
			make_events(item, event.events)
		elif event is CstcEventGroup:
			item_name = "Group: %s" % [event.name]
			var item := make_item(parent, event, item_name)
			make_events(item, event.events)
		else:
			item_name = "<unknown>"

func _on_tree_item_selected():
	var item = get_selected_item()
	item_selected.emit(item)
	if history_idx == -1 or item != history[history_idx]:
		# Update history
		history.resize(history_idx + 1) # Discard elements after current position in history
		history.push_back(item)
		while len(history) > max_history:
			history.pop_front()
		history_idx = len(history) - 1
		# Ensure previous item in history is still valid, else remove
		while history_idx > 0:
			var prev_item_idx := history_idx - 1
			var prev_treeitem = data_treeitem_map.get(history[prev_item_idx])
			if is_instance_valid(prev_treeitem):
				break
			else:
				history.remove_at(prev_item_idx)
				history_idx -= 1
	history_prev_button.disabled = history_idx == 0
	history_next_button.disabled = history_idx == len(history) - 1

var search_thread: Thread

# FIXME: debounce search / cancel existing search on change
func _on_search_bar_text_changed(search_text):
	var search_names := true
	var root = tree.get_root()
	if !root:
		return
	var prev_thread = search_thread
	search_thread = Thread.new()

	search_thread.start(func():
		if prev_thread:
			prev_thread.wait_to_finish()

		if search_text == "":
			# Show all items
			apply_filter(root, func(_data): return true)
		else:
			apply_filter(root, func(data):
				if !data or !data_filter.filter.get(data.get_class()):
					return false
				if data is CstcObjectInstance:
					var tree_item: TreeItem = data_treeitem_map[data]
					if search_names and match_text(search_text, tree_item.get_text(0)):
						return true
					if data.data is CstcTextObjectData:
						return match_text(search_text, data.data.text)
				if search_names:
					if data is CstcAnimation:
						return match_text(search_text, data.name)
					if data is CstcObjectType:
						return match_text(search_text, data.name)
					if data is CstcObjectTrait:
						return match_text(search_text, data.name)
					if data is CstcBehavior:
						return match_text(search_text, data.name)
					if data is CstcFamily:
						return match_text(search_text, data.name)
				return false
			)
	)
func match_text(search_text: String, text: String) -> bool:
	if case_insensitive:
		search_text = search_text.to_lower()
		text = text.to_lower()
	return search_text in text


var case_insensitive = true

func _on_jump_to_selected_pressed():
	var item = tree.get_selected()
	jump_to_item(item)


func _on_data_filter_settings_changed():
	_on_search_bar_text_changed(searchbar.text)

func _on_search_settings_changed():
	case_insensitive = !!search_settings.enabled[&'Ignore case']
	_on_search_bar_text_changed(searchbar.text)
