extends Button

var mod: TowermodModInfo

var hover := false
var active := false

## Call when instantiating
func initialize(mod: TowermodModInfo):
	self.mod = mod

@export var display_name: Label
@export var legacy_badge: Control
@export var author_name: Label
@export var icon_rect: TextureRect

func _ready():
	Util.app_state_changed.connect(_on_app_state_changed)
	if mod:
		self.tooltip_text = "%s [%s]" % [mod.display_name, mod.unique_name()]
		if mod.icon and !mod.icon.is_empty():
			icon_rect.visible = true
			icon_rect.texture = ImageTexture.create_from_image(mod.icon)
		else:
			icon_rect.visible  = false
		display_name.text = mod.display_name
		author_name.text = "by %s" % mod.author
		legacy_badge.visible = mod.mod_type == "Legacy"
		update()

func update():
	self.set_pressed_no_signal(active)
	if self.button_pressed or hover:
		display_name.set(&"theme_override_colors/font_color", Color.WHITE)
	else:
		display_name.set(&"theme_override_colors/font_color", Color("#A6A6A6"))

func _on_app_state_changed(prev_state: Util.AppState, state: Util.AppState):
	if mod and !is_same(prev_state.selected_mod, state.selected_mod):
		active = state.selected_mod and state.selected_mod.unique_name() == mod.unique_name()
		update()

func _on_mouse_entered():
	hover = true
	update()
func _on_mouse_exited():
	hover = false
	update()
func _on_toggled(toggled_on):
	if toggled_on:
		if active:
			self.set_pressed_no_signal(active)
		else:
			Util.selected_mod = mod
			update()

func _gui_input(event):
	if active:
		var sibling = null
		if Input.is_action_just_pressed("ui_up"):
			sibling = Util.prev_sibling(self, false, func(node): return node is Button)
		elif Input.is_action_just_pressed("ui_down"):
			sibling = Util.next_sibling(self, false, func(node): return node is Button)
		if sibling:
			sibling.button_pressed = true
			sibling.grab_focus()
			accept_event()
