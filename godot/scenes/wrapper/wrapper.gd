@tool
extends Node2D


@export var post_processing_container: SubViewportContainer
@export var post_processing_animations: AnimationPlayer
@export var exit_progress := 0.0
@onready var window := get_window()
var minimized := false


func _process(_delta):
	(post_processing_container.material as ShaderMaterial).set_shader_parameter("progress", exit_progress)
	if Engine.is_editor_hint():
		return
	post_processing_container.pivot_offset = post_processing_container.size/2
	if minimized:
		if window.mode != Window.MODE_MINIMIZED:
			post_processing_animations.play("unminimize")
			minimized = false
		return

func _on_main_close_request():
	post_processing_animations.play("close")


func _on_main_minimize_request(): 
	post_processing_animations.play("minimize")


func _on_animation_player_animation_finished(anim_name: String):
	if Engine.is_editor_hint(): return
	if anim_name == "minimize":
		minimized = true
		window.mode = Window.MODE_MINIMIZED
	if anim_name == "close":
		get_tree().quit()
