extends Node

var app = Towermod
var modal_parent: Node
var data: CstcData = null :
	get:
		return app.data

signal blocking_updated(blocking: bool)
signal request_window_title(String)
const SaveExportModal = preload("res://scenes/modal/export_modal.tscn")
const ConfirmModal = preload("res://scenes/modal/modal.tscn")
const Toast = preload("res://scenes/toast/toast.tscn")
var suppress_next_toast := false

var switch_tab: Callable = func(): pass

# Prevent "ESC" used to close native file dialog from propagating to modal and closing that too
var file_dialog_open = false

var background_tasks: int :
	set(v):
		var was_blocking = background_tasks != 0
		background_tasks = max(0, v)
		if background_tasks == 0:
			blocking_updated.emit(false)
		elif !was_blocking:
			blocking_updated.emit(true)

class AppState:
	extends Resource
	var project: TowermodProject
	var game: TowermodGame
	var data: CstcData
	var selected_mod: TowermodModInfo
	var mods_list: Dictionary
	var dirty := true # FIXME: update this flag whenever data is changed/saved
	func _get_property_list():
		var property_list = self.script.get_script_property_list()
		# for property in property_list:
			# if property.usage & PROPERTY_USAGE_SCRIPT_VARIABLE:
				# property.usage = property.usage | PROPERTY_USAGE_STORAGE
		return property_list
		
var app_state: AppState = AppState.new() :
	set(new_state):
		var prev_state = app_state
		app_state = new_state
		app_state_changed.emit(prev_state, new_state)
signal app_state_changed(prev_state: AppState, state: AppState)
var selected_mod: TowermodModInfo :
	set(v):
		var state = Util.dupe(Util.app_state)
		state.selected_mod = v
		Util.app_state = state
	get:
		return Util.app_state.selected_mod

func refresh_mod_list():
	var new_state := Util.dupe(app_state)
	var mods: Array[TowermodModInfo] = await Util.spin(Towermod.list_installed_mods())
	## Mods versions grouped by author+name
	var mods_list := {}
	for mod in mods:
		var key := mod.unique_name()
		if not mods_list.has(key):
			mods_list[key] = []
		mods_list[key].push_back(mod)
	for key in mods_list:
		mods_list[key].sort_custom(func(a: TowermodModInfo, b: TowermodModInfo):
			return Util.cmp_version(a.version, b.version) == 1
		)
	new_state.mods_list = mods_list
	new_state.selected_mod = null
	app_state = new_state

func _init():
	OS.set_environment("RUST_BACKTRACE", "full")
	Towermod.active_project_updated.connect(func(valid):
		if valid:
			var new_state = Util.dupe(app_state)
			new_state.data = Towermod.data
			new_state.project = Towermod.get_project()
			app_state = new_state
		else:
			var new_state = Util.dupe(app_state)
			new_state.data = null
			new_state.project = null
			app_state = new_state
	, CONNECT_DEFERRED)
	Towermod.game_path_updated.connect(func(_path, _valid):
		var new_state = Util.dupe(app_state)
		new_state.game = Towermod.get_game()
		new_state.project = null
		new_state.data = null
		app_state = new_state
	, CONNECT_DEFERRED)
	Towermod.rust_error.connect(_on_rust_error, CONNECT_DEFERRED)


func object_plugin_data(object_type_id: int) -> CstcPluginData:
	var object_type: CstcObjectType = data.object_types.get(object_type_id)
	if object_type:
		return data.editor_plugins.get(object_type.plugin_id)
	return null

func object_action_info(action_id: int, object_type_id: int) -> CstcAcesEntry:
	var plugin_data := object_plugin_data(object_type_id)
	if plugin_data:
		return plugin_data.actions.get(action_id)
	return null
	
signal modal_toggle(bool)

func to_str(o) -> String:
	return str(o)

## Toasts to give visual feedback for actions that otherwise have none
func toast(text):
	if suppress_next_toast:
		suppress_next_toast = false
		return
	var toast = Toast.instantiate()
	toast.text = text
	modal_parent.add_child(toast)

## Workaround for Callable.bind() not working on gdext methods
func bind(callable: Callable, args: Array):
	return func(arg):
		args = args + [arg]
		callable.callv(args)

func _on_rust_error(_message: String):
	background_tasks = 0 # kill loading spinner, all bets are off
	suppress_next_toast = true

func save_project():
	var project = Util.app_state.project
	if project:
		await Util.spin(Towermod.save_project(project.dir_path))
		toast("Project saved.")
	else:
		var save_modal = SaveExportModal.instantiate()
		save_modal.initialize(null, null)
		save_modal.export_type = null
		save_modal.confirmed.connect(func(result):
			var save_project_promise = await Util.spin(Towermod.save_new_project(result.dir_path, result.author, result.name, result.display_name))
			await Util.spin(save_project_promise)
			toast("Project saved.")
		)

func new_project():
	print("Loading data... ", Time.get_ticks_msec())
	await Util.spin(Towermod.init_data())
	print("Done Loading data: ", Time.get_ticks_msec())
	var state = Util.dupe(Util.app_state)
	state.project = null
	state.data = Towermod.data
	Util.app_state = state
	Util.toast("New project initialized.")

func spin(promise_resolve: Signal) -> Signal:
	background_tasks += 1
	return Util.finally(promise_resolve, func():
		background_tasks -= 1
	)

func file_dialog(callback = null) -> FileDialog:
	var modal = FileDialog.new()
	modal.use_native_dialog = true
	modal.access = FileDialog.ACCESS_FILESYSTEM
	modal.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	if callback:
		modal.file_selected.connect(func(path):
			callback.call(path)
			modal.queue_free()
		)
	modal.canceled.connect(modal.queue_free)
	file_dialog_open = true
	get_tree().create_timer(0.1).timeout.connect((func(): file_dialog_open = false))
	modal.show.call_deferred()

	return modal

func confirm_modal(text: String, ok_button_text: String, callback = null) -> Modal:
	var modal = ConfirmModal.instantiate()
	modal.text = text
	modal.ok_button_text = ok_button_text
	if callback:
		modal.confirmed.connect(callback)
	return modal

var disallowed_id_chars = RegEx.create_from_string("[^0-9A-Za-z_-]+")
func restrict_id_text(edit: LineEdit, force_lowercase := true):
	var column = edit.caret_column
	var len_before = len(edit.text)
	var text = disallowed_id_chars.sub(edit.text, "", true)
	if force_lowercase:
		text = text.to_lower()
	edit.text = text
	edit.caret_column = column - 1 if len(text) < len_before else column

func cmp(a, b) -> int:
	if a > b: return 1
	if a < b: return -1
	return 0

func cmp_version(a_str: String, b_str: String) -> int:
	var a = a_str.split('.')
	var b = b_str.split('.')
	
	var i = cmp(int(a[0]), int(b[0]))
	if i != 0: return i
	i = cmp(int(a[1]), int(b[1]))
	if i != 0: return i
	return cmp(int(a[2]), int(b[2]))


# await

func finally(promise_resolve: Signal, finally: Callable) -> Signal:
	var promise_reject = Signal(promise_resolve.get_object(), "reject")
	promise_resolve.connect(finally.unbind(1))
	promise_reject.connect(finally)
	return promise_resolve
func catch(promise_resolve: Signal, catch = null, finally = null) -> Signal:
	if catch:
		var promise_reject = Signal(promise_resolve.get_object(), "reject")
		promise_reject.connect(catch)
	if finally:
		Util.finally(promise_resolve, finally)
	return promise_resolve
func try(promise_resolve: Signal, try = null, catch = null):
	var promise_settled = Signal(promise_resolve.get_object(), "settled")
	if try:
		promise_resolve.connect(try)
	if catch:
		var promise_reject = Signal(promise_resolve.get_object(), "reject")
		promise_reject.connect(catch)
	return promise_settled
func settled(promise_resolve: Signal):
	var promise_settled = Signal(promise_resolve.get_object(), "settled")
	return promise_settled

# time

func time_now():
	return Time.get_ticks_msec()

func time_since(start_time) -> String:
	return "%.2fs" % ((Time.get_ticks_msec() - start_time) / 1000.0)

# iterable manipulation

func find_index(list: Variant, fn: Callable) -> int:
	for i in range(len(list)):
		if fn.call(list[i]):
			return i
	return -1
func find(list: Variant, fn: Callable):
	for el in list:
		if fn.call(el):
			return el
func enumerate(list: Variant) -> Array:
	var new_list = []
	var i = 0
	for el in list:
		new_list.push_back([i, el])
	return new_list

# misc

func tree_find(objects, get_children: Callable, predicate: Callable):
	for object in objects:
		if predicate.call(object):
			return object
		var result = tree_find(get_children.call(object), get_children, predicate)
		if result != null:
			return result

func clear_children(node: Node):
	for child in node.get_children():
		child.queue_free()

## Workaround for https://github.com/godotengine/godot/issues/73036
func free_object(obj: Object):
	obj.free()

func lexp(a: float, b: float, t: float, epsilon: float = 0.0):
	var val = a + (b - a) * (1.0 - exp(-t))
	if abs(b - val) < (epsilon/2.0):
		val = b
	return val

func vlexp(a: Variant, b: Variant, t: float):
	return a + (b - a) * (1.0 - exp(-t))

func spring(a:Variant, b:Variant, vel:Variant, acc := 2.0, att := 0.9):
	vel += acc * (b - a)
	vel *= att
	return vel

func dupe(obj: Object, uninitialized = null) -> Object:
	if obj:
		var property_list = obj.get_property_list()
		var new_obj = uninitialized
		if !(new_obj is Object):
			new_obj = obj.duplicate()
		for property in property_list:
			if property.usage & (PROPERTY_USAGE_CATEGORY | PROPERTY_USAGE_SUBGROUP | PROPERTY_USAGE_GROUP):
				continue
			if property.name == &"script":
				continue
			new_obj.set(property.name, obj.get(property.name))
		return new_obj
	return obj

## Get `offset`th sibling that matches predicate
func get_sibling(node: Node, offset: int, do_wrap := false, predicate := func(_node): return true) -> Node:
	var idx := node.get_index()
	var parent := node.get_parent()
	var count := parent.get_child_count()
	var new_idx = idx
	var matched := 0
	while true:
		new_idx = new_idx + sign(offset)
		if do_wrap:
			new_idx = posmod(new_idx, count)
		if new_idx < 0 or new_idx >= count:
			return null
		var sibling := parent.get_child(new_idx)
		if predicate.call(sibling):
			matched += 1
		if matched >= abs(offset):
			return sibling
		if sibling == node:
			return null
	return null
func next_sibling(node: Node, do_wrap := false, predicate = func(_node): return true) -> Node:
	return get_sibling(node, 1, do_wrap, predicate)
func prev_sibling(node: Node, do_wrap := false, predicate = func(_node): return true) -> Node:
	return get_sibling(node, -1, do_wrap, predicate)

func default_object(name: StringName):
	match name:
		# custom
		&'CstcAnimationFrame':
			return CstcAnimationFrame.new()
		&'CstcGlobalVariable':
			return CstcGlobalVariable.new()
		&'CstcBehaviorControl':
			return CstcBehaviorControl.new()

func default(input: Variant):
	var ty: Variant.Type
	if input is int:
		ty = input
		return default_variant(input)
	elif input is PropertyInfo or input is Dictionary:
		ty = input.type
		var name = input.get(&'classname')
		if name:
			return default_object(name)
		else:
			return default_variant(ty)
	else:
		var name = input
		ty = variant_type_by_name(name)
		if ty == TYPE_OBJECT and name != &'Object':
			default_object(name)
		else:
			return default_variant(ty)

func default_variant(ty: Variant.Type) -> Variant:
	match ty:
		TYPE_NIL:
			return null
		TYPE_BOOL:
			return bool()
		TYPE_INT:
			return int()
		TYPE_FLOAT:
			return float()
		TYPE_STRING:
			return String()
		TYPE_VECTOR2:
			return Vector2()
		TYPE_VECTOR2I:
			return Vector2i()
		TYPE_RECT2:
			return Rect2()
		TYPE_RECT2I:
			return Rect2i()
		TYPE_VECTOR3:
			return Vector3()
		TYPE_VECTOR3I:
			return Vector3i()
		TYPE_TRANSFORM2D:
			return Transform2D()
		TYPE_VECTOR4:
			return Vector4()
		TYPE_VECTOR4I:
			return Vector4i()
		TYPE_PLANE:
			return Plane()
		TYPE_QUATERNION:
			return Quaternion()
		TYPE_AABB:
			return AABB()
		TYPE_BASIS:
			return Basis()
		TYPE_TRANSFORM3D:
			return Transform3D()
		TYPE_PROJECTION:
			return Projection()
		TYPE_COLOR:
			return Color()
		TYPE_STRING_NAME:
			return StringName()
		TYPE_NODE_PATH:
			return NodePath()
		TYPE_RID:
			return RID()
		TYPE_OBJECT:
			return null
		TYPE_CALLABLE:
			return Callable()
		TYPE_SIGNAL:
			return Signal()
		TYPE_DICTIONARY:
			return Dictionary()
		TYPE_ARRAY:
			return Array()
		TYPE_PACKED_BYTE_ARRAY:
			return PackedByteArray()
		TYPE_PACKED_INT32_ARRAY:
			return PackedInt32Array()
		TYPE_PACKED_INT64_ARRAY:
			return PackedInt64Array()
		TYPE_PACKED_FLOAT32_ARRAY:
			return PackedFloat32Array()
		TYPE_PACKED_FLOAT64_ARRAY:
			return PackedFloat64Array()
		TYPE_PACKED_STRING_ARRAY:
			return PackedStringArray()
		TYPE_PACKED_VECTOR2_ARRAY:
			return PackedVector2Array()
		TYPE_PACKED_VECTOR3_ARRAY:
			return PackedVector3Array()
		TYPE_PACKED_COLOR_ARRAY:
			return PackedColorArray()
	return null

func variant_type_by_name(name: StringName) -> Variant.Type:
	match name:
		&'bool':
			return TYPE_BOOL
		&'int':
			return TYPE_INT
		&'float':
			return TYPE_FLOAT
		&'String':
			return TYPE_STRING
		&'Vector2':
			return TYPE_VECTOR2
		&'Vector2i':
			return TYPE_VECTOR2I
		&'Rect2':
			return TYPE_RECT2
		&'Rect2i':
			return TYPE_RECT2I
		&'Vector3':
			return TYPE_VECTOR3
		&'Vector3i':
			return TYPE_VECTOR3I
		&'Transform2D':
			return TYPE_TRANSFORM2D
		&'Vector4':
			return TYPE_VECTOR4
		&'Vector4i':
			return TYPE_VECTOR4I
		&'Plane':
			return TYPE_PLANE
		&'Quaternion':
			return TYPE_QUATERNION
		&'AABB':
			return TYPE_AABB
		&'Basis':
			return TYPE_BASIS
		&'Transform3D':
			return TYPE_TRANSFORM3D
		&'Projection':
			return TYPE_PROJECTION
		&'Color':
			return TYPE_COLOR
		&'StringName':
			return TYPE_STRING_NAME
		&'NodePath':
			return TYPE_NODE_PATH
		&'RID':
			return TYPE_RID
		&'Object':
			return TYPE_OBJECT
		&'Callable':
			return TYPE_CALLABLE
		&'Signal':
			return TYPE_SIGNAL
		&'Dictionary':
			return TYPE_DICTIONARY
		&'Array':
			return TYPE_ARRAY
		&'PackedByteArray':
			return TYPE_PACKED_BYTE_ARRAY
		&'PackedInt32Array':
			return TYPE_PACKED_INT32_ARRAY
		&'PackedInt64Array':
			return TYPE_PACKED_INT64_ARRAY
		&'PackedFloat32Array':
			return TYPE_PACKED_FLOAT32_ARRAY
		&'PackedFloat64Array':
			return TYPE_PACKED_FLOAT64_ARRAY
		&'PackedStringArray':
			return TYPE_PACKED_STRING_ARRAY
		&'PackedVector2Array':
			return TYPE_PACKED_VECTOR2_ARRAY
		&'PackedVector3Array':
			return TYPE_PACKED_VECTOR3_ARRAY
		&'PackedColorArray':
			return TYPE_PACKED_COLOR_ARRAY
	return TYPE_OBJECT

func variant_name_by_type(ty: Variant.Type) -> StringName:
	match ty:
		TYPE_BOOL:
			return &'bool'
		TYPE_INT:
			return &'int'
		TYPE_FLOAT:
			return &'float'
		TYPE_STRING:
			return &'String'
		TYPE_VECTOR2:
			return &'Vector2'
		TYPE_VECTOR2I:
			return &'Vector2i'
		TYPE_RECT2:
			return &'Rect2'
		TYPE_RECT2I:
			return &'Rect2i'
		TYPE_VECTOR3:
			return &'Vector3'
		TYPE_VECTOR3I:
			return &'Vector3i'
		TYPE_TRANSFORM2D:
			return &'Transform2D'
		TYPE_VECTOR4:
			return &'Vector4'
		TYPE_VECTOR4I:
			return &'Vector4i'
		TYPE_PLANE:
			return &'Plane'
		TYPE_QUATERNION:
			return &'Quaternion'
		TYPE_AABB:
			return &'AABB'
		TYPE_BASIS:
			return &'Basis'
		TYPE_TRANSFORM3D:
			return &'Transform3D'
		TYPE_PROJECTION:
			return &'Projection'
		TYPE_COLOR:
			return &'Color'
		TYPE_STRING_NAME:
			return &'StringName'
		TYPE_NODE_PATH:
			return &'NodePath'
		TYPE_RID:
			return &'RID'
		TYPE_OBJECT:
			return &'Object'
		TYPE_CALLABLE:
			return &'Callable'
		TYPE_SIGNAL:
			return &'Signal'
		TYPE_DICTIONARY:
			return &'Dictionary'
		TYPE_ARRAY:
			return &'Array'
		TYPE_PACKED_BYTE_ARRAY:
			return &'PackedByteArray'
		TYPE_PACKED_INT32_ARRAY:
			return &'PackedInt32Array'
		TYPE_PACKED_INT64_ARRAY:
			return &'PackedInt64Array'
		TYPE_PACKED_FLOAT32_ARRAY:
			return &'PackedFloat32Array'
		TYPE_PACKED_FLOAT64_ARRAY:
			return &'PackedFloat64Array'
		TYPE_PACKED_STRING_ARRAY:
			return &'PackedStringArray'
		TYPE_PACKED_VECTOR2_ARRAY:
			return &'PackedVector2Array'
		TYPE_PACKED_VECTOR3_ARRAY:
			return &'PackedVector3Array'
		TYPE_PACKED_COLOR_ARRAY:
			return &'PackedColorArray'
	return &'Object'
