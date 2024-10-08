@tool
extends CanvasGroup

@export var label: Label
@export var text: String :
	set(v):
		text = v
		if is_node_ready():
			label.text = v

func _ready():
	if Engine.is_editor_hint(): return
	text = text
	Towermod.rust_error.connect(_on_rust_error, CONNECT_DEFERRED)

func _on_rust_error(_msg):
	visible = false
	queue_free()

func _process(delta):
	if Engine.is_editor_hint(): return
	position.x = get_window().get_size().x / 2.0
	position.y -= 5*delta
	self_modulate.a = self_modulate.a - 0.5 * delta
	if self_modulate.a <= 0:
		queue_free()
