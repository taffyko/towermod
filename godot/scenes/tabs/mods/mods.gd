extends PanelContainer

@export var play_button: Button
@export var list: ItemList
@export var list2: Control
@export var mod_details: Control
var mods_by_index := []
const ModListItem := preload("res://scenes/tabs/mods/mod_list_item.tscn")

func _ready():
	Util.app_state_changed.connect(_on_app_state_changed)

func _on_start_button_pressed():
	await Util.spin(Towermod.play_mod(Util.selected_mod.file_path))
	Util.toast("Game launched")
func _on_browse_button_pressed():
	OS.shell_open(Towermod.get_mods_dir_path())

func _on_app_state_changed(prev_state: Util.AppState, state: Util.AppState):
	if !is_same(prev_state.game, state.game):
		Util.refresh_mod_list()
	if !is_same(prev_state.mods_list, state.mods_list):
		list.clear()
		for child in list2.get_children():
			child.queue_free()
		mods_by_index = []
		if state.mods_list:
			for key in state.mods_list:
				var mod: TowermodModInfo = state.mods_list[key][0]
				mods_by_index.push_back(mod)
				var icon = ImageTexture.create_from_image(mod.icon) if mod.icon else null
				if icon:
					icon.set_size_override(Vector2i(16, 16))
				list.add_item(mod.display_name, icon)
				var list_item = ModListItem.instantiate()
				list_item.initialize(mod)
				list2.add_child(list_item)
				var separator_stylebox = StyleBoxFlat.new()
				separator_stylebox.border_width_bottom = 1
				separator_stylebox.border_color = Color("#363636")
				var separator = HSeparator.new()
				separator.set(&"theme_override_styles/separator", separator_stylebox)
				separator.set(&"theme_override_constants/separation", 0)
				list2.add_child(separator)
				
		else:
			list.add_item("No mods installed.", null, false)
			list.add_item("Drag & drop zip files to install.", null, false)

func _on_item_list_item_selected(index: int):
	Util.selected_mod = mods_by_index[index]

func _on_refresh_button_pressed():
	Util.refresh_mod_list()
	Util.toast("Reloaded mod list")	
 

func _on_play_vanilla_button_pressed():
	Util.spin(Towermod.start_vanilla())
	Util.toast("Game launched")
