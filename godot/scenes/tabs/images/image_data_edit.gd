extends Control

@export var image_picker: SpinBox
@export var texture_rect: TextureRect
@export var overlay: CanvasItem
@export var collision_rect: TextureRect
@export var inspector: TowermodInspectorObject
@onready var tab_manager = Util.get_context(self, &"tab_manager")

var image_id: int :
	set(v):
		image_id = v
		if Util.data:
			image_picker.value = v
			image = Util.data.images.get(v)
			data = Util.data.image_block.get(v)

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
		inspector.value = v
		if data:
			mask_image = Util.image_from_collision_mask(data.collision_mask, data.collision_pitch, data.collision_width, data.collision_height)
		else:
			mask_image = null

@export var mask_texture_rect: TextureRect
var mask_image: Image :
	set(v):
		mask_image = v
		mask_texture_rect.texture = ImageTexture.create_from_image(v) if v else null

func _ready():
	get_window().files_dropped.connect(_on_files_dropped)
	inspector.supply_custom_properties = InspectorTowermod.supply_custom_properties
	inspector.custom_get_control_for_property = InspectorTowermod.custom_get_control_for_property
	inspector.supply_custom_property_info = InspectorTowermod.supply_custom_property_info
	
	inspector.value_changed.connect(func(value):
		self.data = value
	)

func _input(_event):
	if Input.is_action_just_pressed("test"):
		var mask = Util.create_collision_mask(mask_image)
		mask_image = Util.image_from_collision_mask(mask, data.collision_pitch, data.collision_width, data.collision_height)

func _on_files_dropped(files: PackedStringArray):
	if not tab_manager.current_tab == &'Images':
		return
	if not files:
		return
	var filepath := files[0]
	if filepath.ends_with(".png"):
		var image := Image.load_from_file(filepath)
		var output = Util.create_collision_mask(image)
		data.collision_mask = output.mask
		data.collision_width = output.width
		data.collision_height = output.height
		data.collision_pitch = output.pitch
		mask_image = Util.image_from_collision_mask(output.mask, output.pitch, output.width, output.height)
		self.data = data

func _on_selected_image_changed(new_image_id):
	new_image_id = int(new_image_id)
	if !is_nan(new_image_id):
		self.image_id = new_image_id

func _on_show_collision_toggled(toggled_on):
	collision_rect.visible = toggled_on


func _on_reload_selected_image_pressed():
	pass


func _on_reload_all_images_pressed():
	pass # Replace with function body.
