extends PanelContainer

@export var control_stack: VBoxContainer
@export var game_path_control = LineEdit
@export var game_path_status = StatusLabel
@export var save_project: Button
@export var browse_project: Button
@export var new_project: Button
@export var load_project: Button
@export var export_project: Button
@export var clear_game_cache: Button
@export var export_legacy_project: Button
@export var export_files_project: Button

var FilePathModal = preload("res://scenes/modal/file_path_modal.tscn")
var ExportModal = preload("res://scenes/modal/export_modal.tscn")

func _ready():
	Towermod.game_path_updated.connect(_on_game_path_updated, CONNECT_DEFERRED)
	Util.app_state_changed.connect(_on_app_state_changed)

func clear_cache():
	await Util.spin(Towermod.clear_game_cache())
	Util.toast("Cache cleared.")

func _on_set_game_path_pressed():
	var modal: Modal = FilePathModal.instantiate()
	modal.title = "Set game path"
	modal.text = "Any unsaved project changes will be lost."
	modal.confirmed.connect(func(path):
		game_path_control.text = path
		await Util.spin(Towermod.set_game_path(path))
	)

func _on_game_path_updated(path, valid):
	game_path_control.text = path
	if valid:
		game_path_status.status = StatusLabel.LabelStatus.Ok
		game_path_status.text = "Valid game selected"
		Util.toast("Game path successfully set.")
	elif path:
		game_path_status.status = StatusLabel.LabelStatus.Error
		game_path_status.text = "Unable to load selected game"
		Util.toast("Failed to load selected game.")
	else:
		game_path_status.status = StatusLabel.LabelStatus.Warning
		game_path_status.text = "Please set a valid game path"
		Util.toast("No game selected.")

func _on_app_state_changed(_prev_state: Util.AppState, state: Util.AppState):
	save_project.disabled = !state.data
	browse_project.disabled = !state.project
	export_project.disabled = !state.project
	load_project.disabled = !state.game
	new_project.disabled = !state.game
	clear_game_cache.disabled = !state.game
	export_legacy_project.disabled = !state.game
	export_files_project.disabled = !state.game

func _on_new_project_pressed():
	if !Util.app_state.data:
		Util.new_project()
	else:
		Util.confirm_modal("Any unsaved project changes will be lost.", "Continue", func(_r): Util.new_project())

func _on_load_project_pressed(): 
	var modal = Util.file_dialog(func(path):
		await Util.spin(Towermod.load_project(path))
		Util.toast("Project loaded.")
	)
	modal.use_native_dialog = true
	modal.current_dir = Towermod.get_default_project_dir()
	modal.add_filter("manifest.toml", "Project")

func _on_save_project_pressed():
	Util.save_project()

func _on_browse_project_pressed():
	OS.shell_open(Util.app_state.project.dir_path)

func _on_export_project_pressed():
	var modal = ExportModal.instantiate()
	modal.initialize("BinaryPatch", Util.app_state.project.dir_path)
	modal.project = Util.app_state.project
	modal.show()
	var project: TowermodProject = await modal.confirmed
	
	var new_state = Util.dupe(Util.app_state)
	new_state.project = project
	Towermod.set_project(project)
	Util.app_state = new_state
	
	await Util.save_project() 
	await Util.spin(Towermod.export_mod("BinaryPatch"))
	Util.toast("Exported.")
	Util.switch_tab.call(&"Mods")
	Util.refresh_mod_list()

func _on_nuke_cache_pressed():
	var modal = Util.confirm_modal("""If you are not connected to the internet,
	Towermod will be unable to redownload certain files and will not work until started with internet.
	""", "Nuke all cached files")
	await modal.confirmed
	await Util.spin(Towermod.nuke_cache())
	await Util.spin(Towermod.setup())

func _on_export_files_project_pressed():
	var dialog = Util.file_dialog()
	dialog.file_mode = FileDialog.FILE_MODE_OPEN_DIR
	var project_dir = await dialog.dir_selected
	var modal = ExportModal.instantiate()
	modal.initialize("FilesOnly", project_dir)
	modal.show()
	var project: TowermodProject = await modal.confirmed
	
	await Util.spin(Towermod.export_from_files(project))
	Util.toast("Exported.")
	Util.switch_tab.call(&"Mods")
	Util.refresh_mod_list()

func _on_export_legacy_project_pressed():
	var dialog = Util.file_dialog()
	dialog.add_filter("patch.json, patch.zip", "TCRepainter patch")
	var legacy_patch_path: String = await dialog.file_selected
	
	var project_dir
	if legacy_patch_path.ends_with(".json"):
		project_dir = legacy_patch_path.path_join("../..").simplify_path()
	else:
		project_dir = legacy_patch_path.path_join("..").simplify_path()
	
	var modal = ExportModal.instantiate()
	modal.initialize("Legacy", project_dir)
	modal.show()
	var project: TowermodProject = await modal.confirmed
	
	await Util.spin(Towermod.export_from_legacy(legacy_patch_path, project))
	Util.toast("Exported.")
	Util.switch_tab.call(&"Mods")
	Util.refresh_mod_list()


func _on_browse_cache_pressed():
	OS.shell_open(Towermod.cache_dir_path())
