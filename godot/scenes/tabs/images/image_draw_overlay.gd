extends Control

func create_collision_mask(image: Image) -> PackedByteArray:
	# Determine size of our buffer. All buffers are rounded up to 128 bit pitch, just in case SSE can be used.
	const align_pitch_bits = 64
	const align_pitch_bytes = align_pitch_bits / 8
	
	var bits = PackedByteArray()

	var pitch := image.get_width() / 8
	if image.get_width() % 8 != 0:
		pitch += 1 # 11 pixel width needs 2 bytes not 1 rounded

	# Eg. a 20 byte pitch must round up to 32 (+12, 16 - 4)
	if pitch % align_pitch_bytes != 0:
		pitch += align_pitch_bytes - (pitch % align_pitch_bytes)

	# If the pitch does not leave at least a 64 pixel gutter, increase it by 64 pixels.
	# This prevents false positives when a 64 pixel check from the far right edge can wrap around to the next line.
	if (pitch * 8) - image.get_width() < align_pitch_bits:
		pitch += align_pitch_bytes

	# Allocate and zero the memory
	bits.resize(image.get_height() * pitch)
	bits.fill(0)

	# Loop each pixel and set the bit in the bitmask
	for x in range(image.get_width()):
		for y in range(image.get_height()):
			# Set the bit (check alpha component)
			var bit = 1 if image.get_pixel(x, y).a > 0 else 0
			
			# Invert Y
			bits[(image.get_height() - y - 1) * pitch + (x / 8)] |= bit << (7 - (x % 8))

	return bits

func image_from_collision_mask(bits: PackedByteArray, pitch: int, width: int, height: int):
	# Determine size of our buffer. All buffers are rounded up to 128 bit pitch, just in case SSE can be used.
	const align_pitch_bits = 64
	const align_pitch_bytes = align_pitch_bits / 8

	var image := Image.create(width, height, false, Image.FORMAT_RGBA8)

	# Loop each pixel and set the bit in the bitmask
	for x in range(width):
		for y in range(height):
			var bit = bits[y * pitch + (x / 8)] & (1 << (7 - (x % 8)))
			image.set_pixel(x, y, Color(1., 1., 1., 1. if bit > 0 else 0.))

	return image  

var mask_image: Image :
	set(v):
		mask_image = v
		mask_texture_rect.texture = ImageTexture.create_from_image(v) if v else null
@export var mask_texture_rect: TextureRect

var data: CstcImageMetadata :
	set(v):
		data = v
		if data:
			mask_image = image_from_collision_mask(data.collision_mask, data.collision_pitch, data.collision_width, data.collision_height)
		else:
			mask_image = null
		queue_redraw()

func _draw():
	if !data: 
		return
	var cell_width := get_rect().size.x / data.collision_width
	draw_circle(Vector2(data.hotspot_x, data.hotspot_y) * cell_width, cell_width, Color.BLACK)
	draw_circle(Vector2(data.hotspot_x, data.hotspot_y) * cell_width, cell_width * 0.8, Color.GREEN)
	for apoint in data.apoints:
		draw_circle(Vector2(apoint.x, apoint.y) * cell_width, cell_width, Color.BLACK)
		draw_circle(Vector2(apoint.x, apoint.y) * cell_width, cell_width * 0.8, Color.WHITE)
