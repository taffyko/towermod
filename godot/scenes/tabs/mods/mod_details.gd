extends Control

var versions := []

@export var mod_name: Label
@export var mod_author: Label
@export var description: Label
@export var version_selector: OptionButton
@export var cover_image: TextureRect
@export var icon_image: TextureRect
@export var no_mod_selected: Control
@export var upper: Control
@export var lower: Control
@export var offset_container: Container
@export var date_label: Label
var offset = 25
var done = false

func _ready():
	Util.app_state_changed.connect(_on_app_state_changed)
	update_selected_mod(Util.selected_mod)
	
func _on_app_state_changed(prev_state: Util.AppState, state: Util.AppState):
	if !is_same(prev_state.selected_mod, state.selected_mod):
		update_selected_mod(state.selected_mod)
		
func update_selected_mod(mod: TowermodModInfo):
	if mod is TowermodModInfo:
		versions = Util.app_state.mods_list[mod.unique_name()]
		done = false
		offset = 25

		no_mod_selected.visible = false
		upper.visible = true
		lower.visible = true
		mod_name.text = mod.display_name
		mod_author.text = "— by %s" % [mod.author]
		description.text = mod.description
		var date = Time.get_date_dict_from_unix_time(mod.date)
		date_label.text = "%d-%02d-%02d" % [date.year, date.month, date.day]
		
		if mod.cover and !mod.cover.is_empty():
			cover_image.visible = true
			cover_image.texture = ImageTexture.create_from_image(mod.cover)
		else:
			cover_image.visible = false
		if mod.icon and !mod.icon.is_empty():
			icon_image.visible = true
			icon_image.texture = ImageTexture.create_from_image(mod.icon)
		else:
			icon_image.visible = false
		
		version_selector.clear()
		var idx = 0
		for mod_version in versions:
			version_selector.add_item(mod_version.version)
			if mod_version == mod:
				version_selector.select(idx)
			idx += 1
		version_selector.disabled = version_selector.item_count <= 1
			
	else:
		versions = []
		no_mod_selected.visible = true
		upper.visible = false
		lower.visible = false

func _process(delta: float):
	offset = Util.lexp(offset, 0.0, 10.0 * delta)
	if offset < 0.1:
		if !done:
			done = true
			offset_container.get_parent().queue_sort()
	if !done:
		offset_container.offset_left = -offset
		offset_container.offset_right = size.x - offset

func _on_start_button_pressed():
	await Util.spin(Towermod.play_mod(Util.selected_mod.file_path))
	Util.toast("Game launched")

func _on_version_selector_item_selected(index):
	var version = version_selector.get_item_text(index)
	for mod in versions:
		if mod.version == version:
			Util.selected_mod = mod
