extends Control

@export var image_picker: SpinBox
@export var texture_rect: TextureRect
@export var overlay: CanvasItem
@export var collision_rect: TextureRect
@export var inspector: TowermodInspectorObject

var image: Image :
	set(v):
		image = v
		if image:
			texture_rect.texture = ImageTexture.create_from_image(image)
			texture_rect.max_size = image.get_size() * 5
		else:
			texture_rect.texture = null
		
var data: CstcImageMetadata :
	set(v):
		data = v
		overlay.data = v
		if v != inspector.value:
			inspector.value = v

func _ready():
	inspector.supply_custom_properties = InspectorTowermod.supply_custom_properties
	inspector.custom_get_control_for_property = InspectorTowermod.custom_get_control_for_property
	inspector.supply_custom_property_info = InspectorTowermod.supply_custom_property_info
	
	inspector.value_changed.connect(func(value):
		print("changed")
		self.data = value
	)

func _on_selected_image_changed(image_id):
	image_id = int(image_id)
	if !is_nan(image_id) and Util.data:
		var new_image = Util.data.images.get(image_id)
		var new_image_data = Util.data.image_block.get(image_id)
		image = new_image
		data = new_image_data

func _on_show_collision_toggled(toggled_on):
	collision_rect.visible = toggled_on
