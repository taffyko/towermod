@tool
extends TextureRect
@export var max_size := Vector2()
@export var clickable := false :
	set(v):
		clickable = v
		if is_node_ready():
			internal_button.visible = v
			internal_button.disabled = !v

@export var internal_button: Button

signal pressed

func _ready():
	clickable = clickable

func _process(_delta):
	if texture and max_size:
		var tex_size = texture.get_size()
		while tex_size.x * 2 <= max_size.x and tex_size.y * 2 <= max_size.y:
			tex_size = tex_size * 2
		while tex_size.x > max_size.x or tex_size.y > max_size.y:
			tex_size = tex_size / 2
		custom_minimum_size = tex_size
		expand_mode = EXPAND_IGNORE_SIZE
	else:
		custom_minimum_size = Vector2()
		expand_mode = EXPAND_KEEP_SIZE

func _on_button_pressed():
	pressed.emit()
