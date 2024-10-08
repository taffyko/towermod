extends "res://scenes/modal/modal.gd"



## Required
var project_dir
var export_type

var project: TowermodProject

var display_name_touched = false
var file_path_touched = false
@export var dir_picker: FilePicker
@export var dir_picker_label: StatusLabel
@onready var default_project_dir := Towermod.get_default_project_dir()

@export var mod_name: LineEdit
@export var mod_name_label: StatusLabel
@export var display_name: LineEdit
@export var display_name_label: StatusLabel
@export var author_name: LineEdit
@export var author_name_label: StatusLabel
@export var version: LineEdit
@export var version_label: StatusLabel
@export var duplicate_version_warning: StatusLabel
@export var cover: ImagePicker
@export var icon: ImagePicker
@export var description: TextEdit

@export var export_group: Control

var version_regex := RegEx.create_from_string("[0-9]+\\.[0-9]+\\.[0-9]+")

func initialize(export_type = null, project_dir = null):
	self.export_type = export_type
	self.project_dir = project_dir

func _ready():
	super()
	if not export_type:
		ok_button_text = "Save"
		export_group.visible = false
		dir_picker.visible = true
		dir_picker_label.visible = true
		
	if Engine.is_editor_hint():
		return
	if project_dir and not project:
		var possible_manifest_path = project_dir.path_join("manifest.toml")
		if FileAccess.file_exists(possible_manifest_path):
			project = await Util.spin(Util.settled(TowermodProject.from_path(possible_manifest_path)))
	if not project:
		project = TowermodProject.new()
		if export_type == "FilesOnly":
			project.project_type = "FilesOnly"
		elif export_type == "Legacy":
			project.project_type = "Legacy"
	
	version.text = project.version
	if not export_type and not version.text:
		version.text = "0.0.1"
	mod_name.text = project.name
	author_name.text = project.author
	display_name.text = project.display_name
	description.text = project.description
	if project_dir:
		cover.image_path = project_dir.path_join("cover.png")
		icon.image_path = project_dir.path_join("icon.png")

	mod_name.text_changed.connect(func(_text):
		Util.restrict_id_text(mod_name)
		if !display_name_touched:
			display_name.text = mod_name.text.capitalize().replace("-", " ")
		if !file_path_touched:
			dir_picker.default_location = default_project_dir + "\\" + mod_name.text
			dir_picker.value = default_project_dir + "\\" + mod_name.text
		validate()
	)
	author_name.text_changed.connect(func(_text):
		Util.restrict_id_text(author_name, false)
		validate()
	)
	display_name.text_changed.connect(func(_text):
		display_name_touched = !!display_name.text
		validate()
	)
	version.text_changed.connect(func(_text):
		validate()
	)
	if not export_type:
		dir_picker.changed.connect(func():
			file_path_touched = !!dir_picker.value
			validate()
		)
	validate()
	
func validate():
	var valid = true
	author_name_label.status = StatusLabel.OK if author_name.text else StatusLabel.ERROR
	valid = valid and !!author_name.text
	
	mod_name_label.status = StatusLabel.OK if mod_name.text else StatusLabel.ERROR
	valid = valid and !!mod_name.text
	
	display_name_label.status = StatusLabel.OK if display_name.text else StatusLabel.ERROR
	valid = valid and !!display_name.text
	
	var version_valid := true
	duplicate_version_warning.visible = false
	if export_type:
		var regex_match := version_regex.search(version.text)
		version_valid = version_valid and !!(regex_match and regex_match.get_start() == 0 and regex_match.get_end() == len(version.text))
		version_valid = version_valid and version.text != "0.0.0"
		version_label.status = StatusLabel.OK if version_valid else StatusLabel.ERROR
		valid = valid and version_valid
	
		if version_valid:
			for mods in Util.app_state.mods_list.values():
				for mod in mods:
					if (
						mod.author.to_lower() == author_name.text.to_lower()
						and mod.name == mod_name.text
						and mod.version == version.text
					):
						duplicate_version_warning.text = "\"%s.%s.%s\" already exists." % [mod.author.to_lower(), mod.name, mod.version]
						duplicate_version_warning.text += "\nAvoid publishing duplicate versions publicly."
						duplicate_version_warning.visible = true
						break
	else:
		dir_picker_label.status = StatusLabel.OK if dir_picker.value else StatusLabel.ERROR
		valid = valid and !!dir_picker.value
	
	confirm_button.disabled = !valid

func confirm_args():
	var project: TowermodProject = Util.dupe(project)
	if export_type == null:
		project_dir = dir_picker.value
	project.dir_path = project_dir
	project.version = version.text
	project.name = mod_name.text
	project.author = author_name.text
	project.display_name = display_name.text
	project.description = description.text
	if not export_type:
		project.dir_path = dir_picker.value
	project.game = Util.app_state.game
	var cover_dest_path = project_dir.path_join("cover.png")
	if cover.image_path and cover.image_path != cover_dest_path:
		DirAccess.copy_absolute(cover.image_path, cover_dest_path)
	var icon_dest_path = project_dir.path_join("icon.png")
	if icon.image_path and icon.image_path != icon_dest_path:
		DirAccess.copy_absolute(icon.image_path, icon_dest_path)
	return project
