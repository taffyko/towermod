extends Node

func create_collision_mask(image: Image) -> Dictionary:
	# Determine size of our buffer. All buffers are rounded up to 128 bit pitch, just in case SSE can be used.
	const align_pitch_bits = 64
	const align_pitch_bytes = align_pitch_bits / 8
	
	var bits = PackedByteArray()
	var width := image.get_width()
	var height = image.get_height()

	var pitch := width / 8
	if width % 8 != 0:
		pitch += 1 # 11 pixel width needs 2 bytes not 1 rounded

	# Eg. a 20 byte pitch must round up to 32 (+12, 16 - 4)
	if pitch % align_pitch_bytes != 0:
		pitch += align_pitch_bytes - (pitch % align_pitch_bytes)

	# If the pitch does not leave at least a 64 pixel gutter, increase it by 64 pixels.
	# This prevents false positives when a 64 pixel check from the far right edge can wrap around to the next line.
	if (pitch * 8) - width < align_pitch_bits:
		pitch += align_pitch_bytes

	# Allocate and zero the memory
	bits.resize(height * pitch)
	bits.fill(0)

	# Loop each pixel and set the bit in the bitmask
	for x in range(width):
		for y in range(height):
			# Set the bit (check alpha component)
			var bit = 1 if image.get_pixel(x, y).a > 0 else 0
			
			bits[y * pitch + (x / 8)] |= bit << (7 - (x % 8))

	return {
		mask = bits,
		width = width,
		height = height,
		pitch = pitch,
	}

func image_from_collision_mask(bits: PackedByteArray, pitch: int, width: int, height: int):
	var image := Image.create(width, height, false, Image.FORMAT_RGBA8)

	# Loop each pixel and set the bit in the bitmask
	for x in range(width):
		for y in range(height):
			var bit = bits[y * pitch + (x / 8)] & (1 << (7 - (x % 8)))
			image.set_pixel(x, y, Color(1., 1., 1., 1. if bit > 0 else 0.))

	return image
