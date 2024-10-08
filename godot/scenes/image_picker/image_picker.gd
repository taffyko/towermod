extends TextureRect
class_name ImagePicker

signal changed

var image_path: String :
	set = set_image
var image: Image

func gcd(a: int, b: int) -> int:
	return gcd(b, a%b) if b else a
func reduce(numerator: int, denominator: int):
	var gcd = gcd(numerator,denominator);
	return [numerator/gcd, denominator/gcd];

func _ready():
	$Panel/Label.text = "%s : %s" % reduce(custom_minimum_size.x, custom_minimum_size.y)

func _on_button_pressed():
	var modal = Util.file_dialog()
	modal.add_filter("*.png")
	var path = await modal.file_selected
	image_path = path
	
func set_image(p):
	if FileAccess.file_exists(p):
		image = Image.load_from_file(p)
		if image:
			texture = ImageTexture.create_from_image(image)
			image_path = p
			$Panel.visible = !texture
		else:
			image_path = ""
	else:
		image_path = ""
	changed.emit()
