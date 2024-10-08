@tool
extends Control

@export var label: Label
@export var text = "" :
	set(v):
		text = v
		if label:
			if !Engine.is_editor_hint():
				label.text = v

func _ready():
	text = text

var progress := 0.0

func _process(delta):
	if visible:
		progress += fmod(delta * 5.0, TAU)
		queue_redraw()
	
func _draw():
	var arc = TAU*0.2
	var color = Color(1, 1, 1, 0.6)
	var center = size/2.0
	draw_arc(center, 25, progress, progress + arc, 5, color, 4)
	draw_arc(center, 25, 0, TAU, 20, Color(1, 1, 1, 0.25), 4)
	