extends Button

@export var active := false
var normal_color: Color
var active_color: Color

var box_paths := [
	&"normal",
	&"hover",
	&"pressed",
	&"disabled",
]

func _ready():
	normal_color = get_theme_stylebox(&"normal").bg_color
	active_color = get_theme_stylebox(&"hover").bg_color
	for path in box_paths:
		var box = get_theme_stylebox(path).duplicate()
		add_theme_stylebox_override(path, box)

func _process(delta):
	var target_y := 7 if active else -1
	var color := active_color if active else normal_color
	for path in box_paths:
		var box: StyleBox = get_theme_stylebox(path)
		box.content_margin_top = Util.lexp(box.content_margin_top, target_y, delta * 15, 1.0)
		if path == &"normal":
			box.bg_color = color
