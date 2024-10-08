extends Area2D

@export var control_node: Control
@onready var shape: RectangleShape2D = $CollisionShape2D.shape
@onready var cursor := $Cursor
@onready var cursor_visible = false
var margin = Vector2(0, 0)

func _process(_delta):
	position = control_node.position + control_node.size / 2 + margin
	shape.size = control_node.size - margin
	cursor.position = get_global_mouse_position()
	var target_scale := Vector2(1,1) if cursor_visible else Vector2(0,0)
	cursor.scale = Util.vlexp(cursor.scale, target_scale, 0.5)


func _on_mouse_entered():
	cursor_visible = true
	DisplayServer.mouse_set_mode(DisplayServer.MOUSE_MODE_HIDDEN)


func _on_mouse_exited():
	cursor_visible = false
	DisplayServer.mouse_set_mode(DisplayServer.MOUSE_MODE_VISIBLE)
