shader_type canvas_item;
uniform sampler2D SCREEN_TEXTURE : hint_screen_texture, filter_nearest_mipmap;
uniform sampler2D noise_texture;
uniform float progress;

void fragment() {
	vec4 noise_color = texture(noise_texture, UV);
	vec4 color = texture(TEXTURE, UV);
	color.a = min(color.a, step(0.5, (noise_color.r * 2.0) - mix(-0.6, 1.5, progress)));
	COLOR = color;
}