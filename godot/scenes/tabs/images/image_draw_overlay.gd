extends Control

var data: CstcImageMetadata :
	set(v):
		data = v
		queue_redraw()

func _draw():
	if !data: 
		return
	var image := Util.data.get_image(data.id)
	var cell_width := get_rect().size.x / image.get_width()
	draw_circle(Vector2(data.hotspot_x, data.hotspot_y) * cell_width, cell_width, Color.BLACK)
	draw_circle(Vector2(data.hotspot_x, data.hotspot_y) * cell_width, cell_width * 0.8, Color.GREEN)
	for apoint in data.apoints:
		draw_circle(Vector2(apoint.x, apoint.y) * cell_width, cell_width, Color.BLACK)
		draw_circle(Vector2(apoint.x, apoint.y) * cell_width, cell_width * 0.8, Color.WHITE)
