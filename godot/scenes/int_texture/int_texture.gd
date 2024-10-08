@tool
extends TextureRect
@export var max_size = Vector2()

func _process(_delta):
	if texture:
		var tex_size = texture.get_size()
		while tex_size.x * 2 <= max_size.x and tex_size.y * 2 <= max_size.y:
			tex_size = tex_size * 2
		while tex_size.x > max_size.x or tex_size.y > max_size.y:
			tex_size = tex_size / 2
		custom_minimum_size = tex_size
	else:
		custom_minimum_size = Vector2()
