extends MenuButton

var popup: PopupMenu

signal settings_changed

var data_types_list = [
	&'CstcObjectInstance',
	&'CstcObjectType',
	&'CstcObjectTrait',
	&'CstcFamily',
	&'CstcBehavior',
	&'CstcAnimation',
]
var name_to_index = {}
## Enabled types for searching
var filter = {}

# Called when the node enters the scene tree for the first time.
func _ready():
	popup = get_popup()
	popup.hide_on_item_selection = false
	popup.hide_on_state_item_selection = false
	
	popup.hide_on_checkable_item_selection = false
	popup.id_pressed.connect(_on_menu_item_pressed)
	for i in range(len(data_types_list)):
		var type_name = data_types_list[i]
		filter[type_name] = true
		popup.add_check_item(type_name, i)
		popup.set_item_checked(i, true)
	
func _on_menu_item_pressed(idx):
	if popup.is_item_checkable(idx):
		var type_name = data_types_list[idx]
		filter[type_name] = !filter[type_name]
		popup.set_item_checked(idx, filter[type_name])
		settings_changed.emit()
