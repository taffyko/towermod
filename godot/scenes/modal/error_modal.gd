extends Modal

@export var text_edit: TextEdit
@export_multiline var message: String :
	set(v):
		message = v
		if text_edit:
			text_edit.text = v

func _ready():
	super()
	text_edit.text = message
