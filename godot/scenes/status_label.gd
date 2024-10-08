@tool
class_name StatusLabel
extends Label

enum LabelStatus {
	Ok,
	Warning,
	Error,
}

const OK := LabelStatus.Ok
const WARNING := LabelStatus.Warning
const ERROR := LabelStatus.Error

const COLOR_OK = Color("f5f5f5")
const COLOR_ERR = Color("f2334c")
const COLOR_WARN = Color("f5e167")

func _ready():
	set_status(status)

@export var status: LabelStatus = LabelStatus.Ok :
	set = set_status

func set_status(v):
	if !label_settings:
		label_settings = LabelSettings.new()
	match(v):
		LabelStatus.Ok:
			label_settings.font_color = COLOR_OK
		LabelStatus.Warning:
			label_settings.font_color = COLOR_WARN
		LabelStatus.Error:
			label_settings.font_color = COLOR_ERR
	status = v
