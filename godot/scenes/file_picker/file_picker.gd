extends Control
class_name FilePicker

var line_edit: LineEdit
var browse: Button

var access := FileDialog.ACCESS_FILESYSTEM
@export var default_location: String = ""
@export var filters: PackedStringArray = PackedStringArray(["*.exe ; Executable", "*.* ; Any file"])
@export var file_mode := FileDialog.FILE_MODE_OPEN_FILE

signal changed

var value: String :
	get: 
		return $LineEdit.text
	set(val):
		$LineEdit.text = val

func _ready():
	$LineEdit.text_changed.connect(func(_text): changed.emit())

func pick_file():
	var modal = FileDialog.new()
	if default_location:
		var err = DirAccess.make_dir_recursive_absolute(default_location)
		if err == OK or err == ERR_ALREADY_EXISTS:
			modal.current_dir = default_location
	modal.use_native_dialog = true
	modal.access = access
	modal.file_mode = file_mode
	modal.filters = filters
	modal.file_selected.connect(func(path):
		value = path
		changed.emit()
		modal.queue_free()
	)
	modal.dir_selected.connect(func(path):
		value = path
		changed.emit()
		modal.queue_free()
	)
	modal.canceled.connect(modal.queue_free)
	modal.confirmed.connect(modal.queue_free)
	modal.show()


func _on_browse_pressed():
	pick_file()
