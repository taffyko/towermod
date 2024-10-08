@tool
extends Modal

@export_node_path var file_picker: NodePath

func confirm_args():
	var file_picker = get_node(file_picker)
	var path = file_picker.value
	return path
