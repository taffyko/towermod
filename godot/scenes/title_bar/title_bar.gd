extends Control

@onready var version = Towermod.version()

@export var window_title_label: Label
var dragging_start_position := Vector2i()
var window_start_position := Vector2i()
var following := false
var window_title := "" :
	set(value):
		window_title = value
		if value:
			window_title_label.text = "TowerMod v%s — " % [version] + value
		else:
			window_title_label.text = "TowerMod v%s" % [version]
	get: return window_title

func _on_request_window_title(title: String):
	window_title = title
	
func _gui_input(event):
	if event is InputEventMouseButton:
		if event.button_index == 1:
			following = event.pressed
			dragging_start_position = DisplayServer.mouse_get_position()
			window_start_position = get_window().position
			
	

signal minimize_requested
signal exit_requested

func _ready():
	Util.request_window_title.connect(_on_request_window_title)
	

func _process(_delta):
	if following:
		var window := get_window()
		window.set_position(window_start_position + DisplayServer.mouse_get_position() - dragging_start_position)

func _on_minimize_pressed():
	minimize_requested.emit()

func _on_exit_pressed():
	if Util.app_state.data:
		var modal = Util.confirm_modal("Any unsaved data will be lost", "Exit")
		await modal.confirmed
		exit_requested.emit()
	else:
		exit_requested.emit()
