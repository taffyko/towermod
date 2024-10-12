@tool
extends Control

@onready var window := get_window()
@onready var scale_factor := 1
@export var current_tab := &"Config" :
	set = switch_tab

@export var ConfirmModal = preload("res://scenes/modal/modal.tscn")
@export var ErrorModal = preload("res://scenes/modal/error_modal.tscn")

@export var enabled_tabs: Dictionary = {&"Config": true} :
	set(v):
		enabled_tabs = v
		if is_node_ready():
			for button in tab_buttons:
				button.visible = button.name in enabled_tabs
			if !enabled_tabs.is_empty() and !(current_tab in enabled_tabs):
				current_tab = enabled_tabs.keys().front()
@export var tabs_parent: Control
@export var modal_background: Control
@export var loading_spinner: CanvasItem
@onready var tabs := tabs_parent.get_children()
@export var tab_buttons_parent: Control
@onready var tab_buttons := tab_buttons_parent.get_children()

signal close_request
signal minimize_request
signal tab_switched(name: StringName)

func enable_tab(tab_name: StringName):
	enabled_tabs[tab_name] = true
	enabled_tabs = enabled_tabs
func disable_tab(tab_name: StringName):
	enabled_tabs.erase(tab_name)
	enabled_tabs = enabled_tabs

func _init():
	if !Engine.is_editor_hint():
		Util.modal_parent = self
		Towermod.rust_error.connect(_on_rust_error, CONNECT_DEFERRED)
		Messenger.rust_status_update.connect(_on_rust_status_update, CONNECT_DEFERRED)
		Towermod.rust_confirm_warning.connect(_on_rust_confirm_warning, CONNECT_DEFERRED)
		Util.app_state_changed.connect(_on_app_state_changed)
		Util.blocking_updated.connect(_on_blocking_updated)

func _ready():
	for tab in tabs:
		get_tab_button(tab.name).pressed.connect(func(): current_tab = tab.name)
		if tab.has_method(&"_on_main_tab_switched"):
			tab_switched.connect(tab._on_main_tab_switched)
	enabled_tabs = enabled_tabs
	if Engine.is_editor_hint(): return
	get_window().size = Vector2(480, 480)
	Util.switch_tab = switch_tab
	print("RUST_BACKTRACE=", OS.get_environment("RUST_BACKTRACE"))
	Util.modal_toggle.connect(_on_modal_toggle)
	switch_tab(current_tab)
	await Util.spin(Towermod.setup())
	get_window().files_dropped.connect(_on_files_dropped)
	if OS.has_feature("debug"):
		Util.new_project()

func _on_files_dropped(files: PackedStringArray):
	var mods_dir_path = Towermod.get_mods_dir_path()
	var installed = []
	for filepath in files:
		filepath = filepath.to_lower().replace("\\", "/").simplify_path()
		var filename = filepath.get_file()
		if filename.ends_with(".zip"):
			var mod_info = await Util.spin(TowermodModInfo.from_zip_path(filepath))
			var dest_filename = "%s.zip" % mod_info.unique_version_name()
			var dest_path = mods_dir_path.to_lower().replace("\\", "/").simplify_path().path_join(dest_filename)
			if filepath != dest_path:
				if DirAccess.copy_absolute(filepath, dest_path) == OK:
					installed.append(filename)
	if installed:
		Util.refresh_mod_list()
		Util.toast("Installed:\n" + "\n".join(installed))
		switch_tab(&"Mods")
	else:
		Util.toast("Installed nothing.")
		
	
func _input(event):
	if Engine.is_editor_hint(): return
	if modal_background.visible: return
	if event.is_action_pressed(&"ui_tab_prev"):
		current_tab = prev_tab()
	elif event.is_action_pressed(&"ui_tab_next"):
		current_tab = next_tab()
	elif event.is_action_pressed(&"ui_focus_next") or event.is_action_pressed(&"ui_tab_prev"):
		if get_viewport().gui_get_focus_owner() == null:
			var node = get_tab_node(current_tab)
			if node:
				node = node.find_next_valid_focus()
				if node:
					node.grab_focus.call_deferred()

func _process(_delta):
	if Engine.is_editor_hint(): return
	var callable = Messenger.poll_queue()
	if callable:
		callable.call()
	update_size()

func update_size():
	if Engine.is_editor_hint(): return
	size = window.size / scale_factor
	pivot_offset = size / 2

func _on_title_bar_exit_requested():
	close_request.emit()

func _on_title_bar_minimize_requested():
	minimize_request.emit()

func get_tab_node(tab_name):
	for tab in tabs:
		if tab.name == tab_name:
			return tab
func get_tab_button(tab_name):
	for button in tab_buttons:
		if button.name == tab_name:
			return button

func next_tab():
	var i = Util.find_index(tabs, func(t): return t.name == current_tab)
	while true:
		i = (i+1) % len(tabs)
		if tabs[i].name in enabled_tabs:
			return tabs[i].name
func prev_tab():
	var i = Util.find_index(tabs, func(t): return t.name == current_tab)
	while true:
		i = (i-1) % len(tabs)
		if tabs[i].name in enabled_tabs:
			return tabs[i].name

func switch_tab(tab_name: StringName):
	if current_tab != tab_name:
		current_tab = tab_name
	if Engine.is_editor_hint(): return
	for tab in tabs:
		tab.visible = tab.name == tab_name
	for tab_button in tab_buttons:
		tab_button.active = tab_button.name == tab_name
	tab_switched.emit(tab_name)

func _on_modal_toggle(modal_active: bool):
	if modal_active:
		modal_background.visible = true
		$Window/Body.process_mode = PROCESS_MODE_DISABLED
		$Window/Body/ContentContainer/Content.gui_disable_input = true
	else:
		modal_background.visible = false
		$Window/Body.process_mode = PROCESS_MODE_INHERIT
		$Window/Body/ContentContainer/Content.gui_disable_input = false

func _on_rust_error(message: String):
	var modal = ErrorModal.instantiate()
	modal.message = message
	
func _on_rust_status_update(message: String):
	loading_spinner.text = message

func _on_rust_confirm_warning(message: String, confirm_text: String, base: Object, callback_name: String, args: Array):
	var modal: Modal = ConfirmModal.instantiate()
	modal.text = message
	modal.ok_button_text = confirm_text
	modal.confirmed.connect(func(_a = null):
		var callback = Callable(base, callback_name).bindv(args)
		await Util.spin(callback.call())
	)

func _on_blocking_updated(blocking: bool):
	loading_spinner.visible = blocking
	if !blocking:
		loading_spinner.text = ""
func _on_app_state_changed(_prev_state: Util.AppState, state: Util.AppState):
	if state.game:
		if state.data:
			enabled_tabs = {&"Config":true, &"Mods":true, &"Data":true, &"Images":true, &"Events":true}
			if Towermod.is_project_named():
				Util.request_window_title.emit(state.project.display_name)
			else:
				Util.request_window_title.emit("Unsaved project")
		else:
			Util.request_window_title.emit("")
			var newly_enabled = &"Mods" not in enabled_tabs
			enabled_tabs = {&"Config":true, &"Mods":true, &"Images":true}
			if newly_enabled:
				current_tab = &"Mods"
	else:
		Util.request_window_title.emit("(NO GAME SELECTED)")
		enabled_tabs = {&"Config":true}
