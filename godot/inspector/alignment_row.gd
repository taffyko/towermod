extends Container
class_name AlignmentRow

var parent: AlignmentContainer :
	get: return get_parent()

var max_size_px :
	get: return parent.max_size_px
var max_size_percentage :
	get: return parent.max_size_percentage
var column_gap :
	get: return parent.column_gap
var longest_label :
	get: return parent.longest_label
var label: Control

func _notification(what):
	if what == NOTIFICATION_SORT_CHILDREN:
		var parent_min_size = get_combined_minimum_size()
		var max_label_width: int = floor(max_size_percentage * size.x)
		if max_size_px > 0:
			max_label_width = min(max_size_px, max_label_width)
		
		var label_column_width = min(max_label_width, longest_label)
		var content_column_width = size.x - label_column_width - column_gap
		
		var children = get_valid_visible_children()
		var child_count = len(children)
		label = children[0] if child_count > 0 else null
		if !label:
			return
		var content: Control = children[1] if child_count > 1 else null
			
		var row_height = parent_min_size.y
		for c in [label, content]:
			if !c:
				continue
			var x = 0
			var min_size = c.get_combined_minimum_size()
			
			var available_width
			if c == label:
				available_width = label_column_width
			else:
				available_width = content_column_width
				x = label_column_width + column_gap
				
			var width = available_width
			if not (c.size_flags_horizontal & SIZE_FILL):
				width = min(width, min_size.x)
			var height = row_height
			if not (c.size_flags_vertical & SIZE_FILL):
				height = min(height, min_size.y)
			
			fit_child_in_rect(c, Rect2(x, 0, width, height))

func get_valid_visible_children() -> Array[Control]:
	var children := get_children()
	var output: Array[Control] = []
	for c in children:
		if c is Control and c.visible:
			output.append(c)
	return output
	
## temporarily disable wrapping for all labels
## in order to get the new min width
## TODO: trigger recalculation when label content changes
func get_minimum_unwrapped_label_size() -> Vector2:
	label = get_child(0)
	if !label:
		return Vector2.ZERO
	var nodes = [label] + label.get_children()
	var modes = []
	modes.resize(len(nodes))
	for i in range(len(nodes)):
		var c = nodes[i]
		if c is Label or c is RichTextLabel or c is TextEdit:
			modes[i] = c.autowrap_mode
			c.autowrap_mode = TextServer.AUTOWRAP_OFF
			c.get_minimum_size() # trigger recalculation
	var min_size = label.get_minimum_size()
	for i in range(len(nodes)):
		var c = nodes[i]
		if c is Label or c is RichTextLabel or c is TextEdit:
			c.autowrap_mode = modes[i]
			c.get_minimum_size() # trigger recalculation to prevent container from using bad cached min size
	return min_size
	
	

func _get_minimum_size() -> Vector2:
	var children := get_valid_visible_children()
	var child_count := len(children)

	var label: Control = children[0] if child_count > 0 else null
	if !label: return Vector2(0, 0)
	var content: Control = children[1] if child_count > 1 else null
	
	var label_min = label.get_combined_minimum_size()
	var content_min = content.get_combined_minimum_size() if content else label_min
	var width = label_min.x + column_gap + content_min.x
	var height = max(label_min.y, content_min.y)

	return Vector2(width, height)
