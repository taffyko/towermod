@tool
extends Modal

@onready var default_project_dir := Towermod.get_default_project_dir()
var display_name_touched = false
var file_path_touched = false
@export var mod_name: LineEdit
@export var display_name: LineEdit
@export var author_name: LineEdit
@export var dir_picker: FilePicker

func _ready():
	super()
	if Engine.is_editor_hint():
		return
	mod_name.text_changed.connect(func(_text):
		Util.restrict_id_text(mod_name)
		dir_picker.default_location = default_project_dir + "\\" + mod_name.text
		if !display_name_touched:
			display_name.text = mod_name.text.capitalize().replace("-", " ")
		if !file_path_touched:
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
	dir_picker.changed.connect(func():
		file_path_touched = !!dir_picker.value
		validate()
	)
	
func validate():
	confirm_button.disabled = !(author_name.text and mod_name.text and display_name.text and dir_picker.value)

func confirm_args():
	return {
		author_name = author_name.text,
		mod_name = mod_name.text,
		display_name = display_name.text,
		path = dir_picker.value
	}
