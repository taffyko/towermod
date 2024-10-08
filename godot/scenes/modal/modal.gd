@tool
class_name Modal
extends Window

var border_top = 0
signal confirmed(result: Variant)
signal cancelled
@export var confirm_button: Button
@export var cancel_button: Button
@export var label: Label
@export var ok_button_text := "OK" :
	set(v):
		ok_button_text = v
		if is_node_ready():
			confirm_button.text = v
@export var cancel_button_text := "Cancel" :
	set(v):
		cancel_button_text = v
		if is_node_ready():
			cancel_button.text = v
@export var hide_ok = false :
	set(value):
		hide_ok = value
		_update_hide_buttons()
@export var hide_cancel = false :
	set(value):
		hide_cancel = value
		_update_hide_buttons()
@export_multiline var text: String = "" :
	set(v):
		text = v
		label.text = text
		label.visible = !!text
	get:
		return text

func _init(on_confirm = null, on_cancel = null):
	if Engine.is_editor_hint(): return
	if on_confirm:
		confirmed.connect(on_confirm)
	if on_cancel:
		cancelled.connect(on_cancel)
	# deferring this call prevents godot from occasionally crashing (upstream bug)
	(func():
		if !self.get_parent():
			Util.modal_parent.add_child(self)
	).call_deferred()

func confirm_args() -> Variant:
	return null

func _update_hide_buttons():
	if is_node_ready():
		cancel_button.visible = !hide_cancel
		confirm_button.visible = !hide_ok

func _on_cancel_button_pressed():
	Util.modal_toggle.emit(false)
	queue_free()
	cancelled.emit()
func _on_confirm_button_pressed():
	Util.modal_toggle.emit(false)
	queue_free()
	confirmed.emit(confirm_args())

func _ready():
	_update_hide_buttons()
	cancel_button.pressed.connect(_on_cancel_button_pressed)
	confirm_button.pressed.connect(_on_confirm_button_pressed)
	ok_button_text = ok_button_text
	cancel_button_text = cancel_button_text
	close_requested.connect(_on_cancel_button_pressed)
	exclusive = false
	unresizable = true
	visible = true
	var border = get_theme_stylebox(&"embedded_border")
	border_top = border.content_margin_top
	
	if !Engine.is_editor_hint():
		Util.modal_toggle.emit(true)

func _input(event):
	if event is InputEventKey:
		if Input.is_action_just_pressed("ui_cancel"):
			if !Util.file_dialog_open:
				_on_cancel_button_pressed()
			else:
				Util.file_dialog_open = false

func _process(_delta):
	var border = get_theme_stylebox(&"embedded_border")
	border_top = border.expand_margin_top
	var margin = 25
	var window_top = 22
	var window = get_parent().get_window()
	var window_size_x = window.size.x
	var window_size_y = window.size.y
	if Engine.is_editor_hint():
		window_top = 0
		window_size_x = ProjectSettings.get("display/window/size/viewport_width")
		window_size_y = ProjectSettings.get("display/window/size/viewport_height")
	position = Vector2(margin, border_top + window_top + margin)
	size = Vector2(window_size_x - margin*2, window_size_y - window_top - border_top - margin*2)
