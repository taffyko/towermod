extends Node2D

var rect = Rect2(0,0,0,0)
var color = Color(1,1,1,1)

var enabled = false
var focused: Control = null : set = focus_changed
var last_input_was_keyboard = false

func _ready():
	get_viewport().gui_focus_changed.connect(focus_changed)

func _input(event):
	if (event is InputEventMouseButton and event.button_index in [MOUSE_BUTTON_LEFT, MOUSE_BUTTON_RIGHT, MOUSE_BUTTON_MIDDLE]) or event.is_action_pressed("ui_cancel"):
		enabled = false
		last_input_was_keyboard = false
	elif !enabled and event is InputEventKey:
		if event.is_action_pressed("ui_accept"):
			if focused and !(focused is TextEdit or focused is LineEdit):
				rect = focused.get_global_rect()
				enabled = true
		else:
			last_input_was_keyboard = true

func focused_item_freed():
	focused = null

func focus_changed(new_focus: Control):
	if new_focus != focused:
		# Drop reference when focused node is freed
		if new_focus:
			new_focus.tree_exiting.connect(focused_item_freed)
		# Disconnect old signal
		if focused and focused.tree_exiting.is_connected(focused_item_freed):
			focused.tree_exiting.disconnect(focused_item_freed)
		focused = new_focus
	if focused == null:
		push_warning("focus_changed() called with null Control")
		return
	if last_input_was_keyboard:
		if !enabled:
			rect = focused.get_global_rect()
		enabled = true

func _process(_delta):
	if focused and !focused.has_focus():
		enabled = false
	if focused and enabled:
		var target_rect := focused.get_global_rect()
		rect.size = Util.vlexp(rect.size, target_rect.size, 0.5)
		rect.position = Util.vlexp(rect.position, target_rect.position, 0.5)
	elif !focused:
		rect.size = Vector2.ZERO
		rect.position = Vector2.ZERO
	color = Util.vlexp(color, Color(1,1,1,1) if enabled else Color(1,1,1,0), 0.5) 
	queue_redraw()

func _draw():
	if focused:
		draw_rect(rect, color, false, 1.0)
