extends VBoxContainer
class_name AlignmentContainer

@export var max_size_px := 300 :
	set(v):
		recalculate_layout()
		max_size_px = v
@export var max_size_percentage := 0.4 :
	set(v):
		recalculate_layout()
		max_size_percentage = v
@export var column_gap := 5 :
	set(v):
		recalculate_layout()
		column_gap = v
var longest_label := 0

func recalculate_layout():
	update_minimum_size()
	queue_sort()

func _notification(what):
	if what == NOTIFICATION_SORT_CHILDREN:
		longest_label = 0
		for c in get_children():
			if c is AlignmentRow:
				var label_size = c.get_minimum_unwrapped_label_size()
				if label_size.x > longest_label:
					longest_label = label_size.x
				c.queue_sort()

#func _notification(what):
	#if what == NOTIFICATION_SORT_CHILDREN:
		#var parent_min_size = get_combined_minimum_size()
		#var y_offset := 0
		#var max_label_width: int = floor(max_size_percentage * size.x)
		#if max_size_px > 0:
			#max_label_width = min(max_size_px, max_label_width)
		#
		#var label_column_width = max_label_width
		#var content_column_width = size.x - label_column_width - column_gap
		#
		#var i := 0
		#var children = get_valid_visible_children()
		#var child_count = len(children)
		#var first_row = true
		#while i+1 < child_count:
			#var label: Control = children[i]
			#var content: Control = children[i+1]
			#var label_min = label.get_combined_minimum_size()
			#var content_min = content.get_combined_minimum_size()
			#var row_height = max(label_min.y, content_min.y)
			#if not first_row:
				#y_offset += row_gap
			#for c in [label, content]:
				#var x = 0
				#var min_size = c.get_combined_minimum_size()
				#
				#var available_width
				#if c == label:
					#available_width = max_label_width
				#else:
					#available_width = content_column_width
					#x = label_column_width + column_gap
					#
				#var width = available_width
				#if not (c.size_flags_horizontal & SIZE_FILL):
					#width = min(width, min_size.x)
				#var height = row_height
				#if not (c.size_flags_vertical & SIZE_FILL):
					#height = min(height, min_size.y)
				#
					#
				#fit_child_in_rect(c, Rect2(x, y_offset, width, height))
			#y_offset += row_height
			#i += 2
			#first_row = false
#
#func get_valid_visible_children() -> Array[Control]:
	#var children := get_children()
	#var output: Array[Control] = []
	#for c in children:
		#if c is Control and c.visible:
			#output.append(c)
	#return output
	#
		#
#func _get_minimum_size() -> Vector2:
	#var children = get_valid_visible_children()
	#var child_count = len(children)
	#var height = 0
	#var width = 0
	#
	#var i = 0
	#var first = true
	#while i+1 < child_count:
		#var label: Control = children[i]
		#var content: Control = children[i+1]
		#var label_min = label.get_combined_minimum_size()
		#var content_min = content.get_combined_minimum_size()
		#
		#width = max(width, label_min.x + column_gap + content_min.x)
		#if !first:
			#height += row_gap
		#height += max(label_min.y, content_min.y)
#
		#first = false
		#i += 2
	#return Vector2(width, height)
#
## Called when the node enters the scene tree for the first time.
#func _ready():
	#pass
#
#
## Called every frame. 'delta' is the elapsed time since the previous frame.
#func _process(delta):
	#pass
