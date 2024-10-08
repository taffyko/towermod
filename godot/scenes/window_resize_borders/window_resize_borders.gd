@tool
extends Control
@export var root_control: Control = null
@export_range(0, 100) var thickness: int = 6 :
	set(v):
		thickness = v
		if is_node_ready():
			$Top.custom_minimum_size = Vector2(0,v)
			$Right.custom_minimum_size = Vector2(v,0)
			$Bottom.custom_minimum_size = Vector2(0,v)
			$Left.custom_minimum_size = Vector2(v,0)
			$TopRight.custom_minimum_size = Vector2(v*2,v*2)
			$BottomRight.custom_minimum_size = Vector2(v*2,v*2)
			$BottomLeft.custom_minimum_size = Vector2(v*2,v*2)
			$TopLeft.custom_minimum_size = Vector2(v*2,v*2)

var cursor_start := Vector2i()
var window_position_start := Vector2i()
var window_size_start := Vector2i()
var previous_window_size := Vector2i()
var edge := Edge.NONE
@onready var window := get_window()
@onready var min_size := Vector2i(
	ProjectSettings.get("display/window/size/viewport_width"),
	ProjectSettings.get("display/window/size/viewport_height")
)

func _ready():
	window.min_size = min_size

signal window_resized

enum Edge {
	NONE = 0,
	TOP = 1,
	RIGHT = 2,
	BOTTOM = 4,
	LEFT = 8,
}

func _process(_delta: float):
	if Engine.is_editor_hint(): return
	if edge:
		var diff := DisplayServer.mouse_get_position() - cursor_start
		if edge & Edge.TOP:
			window.size.y = max(min_size.y, 0, window_size_start.y - diff.y)
			if window.size.y != previous_window_size.y:
				window.position.y = window_position_start.y + diff.y
		if edge & Edge.RIGHT:
			window.size.x = max(min_size.x, 0, window_size_start.x + diff.x)
		if edge & Edge.BOTTOM:
			window.size.y = max(min_size.y, 0, window_size_start.y + diff.y)
		if edge & Edge.LEFT:
			window.size.x = max(min_size.x, 0, window_size_start.x - diff.x)
		window.size = (Vector2(window.size)/2).round()*2
		if edge & Edge.LEFT:
			window.position.x += previous_window_size.x - window.size.x
		if edge & Edge.TOP:
			window.position.y += previous_window_size.y - window.size.y
		previous_window_size = window.size
		window_resized.emit()

func _on_edge_gui_input(event: InputEvent, clicked_edge: Edge):
	if Engine.is_editor_hint(): return
	if event is InputEventMouseButton:
		if event.button_index == 1:
			edge = clicked_edge if event.pressed else Edge.NONE
			cursor_start = DisplayServer.mouse_get_position()
			window_position_start = window.position
			window_size_start = window.size
			previous_window_size = window_size_start
