shader_type canvas_item;
uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_nearest_mipmap;
uniform float scale = 1.0;

void fragment() {
	vec2 uv = (((SCREEN_UV / SCREEN_PIXEL_SIZE) * scale)) * SCREEN_PIXEL_SIZE;
	COLOR = texture(SCREEN_TEXTURE, uv);
}