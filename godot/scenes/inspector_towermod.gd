extends Object

class_name InspectorTowermod

static var data: CstcData:
	get:
		return Util.app_state.data

const InspectorNumeric = preload("res://inspector/inspector_numeric.gd")
const IntTexture = preload("res://scenes/int_texture/int_texture.tscn")

static var outliner
static func initialize(new_outliner):
	outliner = new_outliner

static func get_animation_icon(animation: CstcAnimation):
	var icon = null
	var frame_count := len(animation.frames)
	if frame_count > 0:
		var image = data.get_image(animation.frames[0].image_id)
		if image != null:
			icon = ImageTexture.create_from_image(image)
	if icon == null:
		for sub_animation in animation.sub_animations:
			icon = get_animation_icon(sub_animation)
			if icon != null:
				break
	return icon

static func get_cstc_icon(obj) -> ImageTexture:
	var get = func():
		if obj is CstcObjectContainer:
			if !obj.object_ids.is_empty():
				# use icon of first object instance in the container
				var obj_instance = data.get_object_type(obj.object_ids.front())
				return get_cstc_icon(obj_instance)
		if obj is CstcAnimation:
			return get_animation_icon(obj)
		if obj is CstcObjectInstance:
			var obj_data = obj.data
			if obj_data is CstcSpriteObjectData:
				# use icon of associated animation
				var animation = data.get_animation(obj_data.animation)
				return get_cstc_icon(animation)
			else:
				pass # TODO: use icon of cstc plugin
		if obj is CstcObjectType:
			# use icon of the first instance
			return get_cstc_icon(get_first_instance_of_type(obj.id))
		return null
	var texture = get.call()
	const MAX_HEIGHT = 64
	if texture is ImageTexture:
		var height = int(texture.get_height())
		if height > MAX_HEIGHT:
			var width = int(texture.get_width())
			width = int(width * float(MAX_HEIGHT)/float(height))
			height = MAX_HEIGHT
			var size = Vector2i(width, height)
			texture.set_size_override(size)
	return texture
	

static func outliner_link(value, pinfo, get_by_id: Callable):
	return TowermodInspectorCustom.new(value, pinfo, func(node: TowermodInspectorCustom):
		var read_only = false
		var no_id = false
		if &'usage' in pinfo and pinfo.usage & PROPERTY_USAGE_READ_ONLY:
			read_only = true
		if value is Object:
			no_id = true
			read_only = true

		var hbox = HBoxContainer.new()
		
		var update_id = func(value):
			var old_button = null
			if hbox.has_node("Button"):
				old_button = hbox.get_node("Button")
			if old_button:
				old_button.name = &"Button_old"
				old_button.queue_free()
			
			var data_obj = get_by_id.call(value)
			var display_text
			if data_obj is Array:
				display_text = data_obj[1]
				data_obj = data_obj[0]
			else:
				display_text = str(data_obj)
			var button := Button.new()
			button.name = "Button"
			button.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
			button.text = display_text
			if data_obj:
				button.icon = get_cstc_icon(data_obj)
				var tree_item: TreeItem = outliner.data_treeitem_map[data_obj]
				button.disabled = false
				button.pressed.connect(func():
					outliner.jump_to_item(tree_item)
					outliner.tree.set_selected(tree_item, 0)
				)
			else:
				button.disabled = true
			hbox.add_child(button)
			
			node.set_value_and_emit(value)
		
		var id_edit
		if !read_only:
			id_edit = InspectorNumeric.numeric_edit(value)
			id_edit.value_changed.connect(func(v):
				update_id.call(int(v))
			)
			hbox.add_child(id_edit)
		elif not no_id:
			var label = Label.new()
			label.text = str(value)
			hbox.add_child(label)
		update_id.call(value)
		node.add_child(hbox)
	)

static func object_instance_link(value, pinfo):
	return outliner_link(value, pinfo, func(value):
		var object_instance := data.get_object(value)
		var object_type := object_instance.get_object_type()
		return [
			object_instance,
			"Instance (%s: %s)" % [object_type.get_plugin_name(), object_type.name],
		]
	)
static func object_type_link(value, pinfo):
	return outliner_link(value, pinfo, func(value):
		var object_type = data.get_object_type(value)
		if object_type:
			return [
				object_type,
				"%s (%s)" % [object_type.name, object_type.get_plugin_name()],
			]
	)
static func animation_link(value, pinfo):
	return outliner_link(value, pinfo, func(value):
		var animation = data.get_animation(value)
		return [
			animation,
			"Animation %s" % animation.id,
		]
	)

static func get_first_instance_of_type(object_type_id: int):
	return data.get_objects_by_type(object_type_id).front()

static func animation_frame(value: CstcAnimationFrame, pinfo):
	return TowermodInspectorCustom.new(value, pinfo, func(node: TowermodInspectorCustom):
		var tex = IntTexture.instantiate()
		tex.clickable = true
		tex.pressed.connect(func():
			var tab_manager = Util.get_context(tex, &"tab_manager")
			tab_manager.jump_to_image(value.image_id)
		)
		tex.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		tex.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT
		var update_image = func():
			var new_image = data.get_image(value.image_id)
			if new_image:
				tex.texture = ImageTexture.create_from_image(new_image)
			else:
				tex.texture = null
				
		var id_edit = InspectorNumeric.numeric_edit(value.image_id)
		id_edit.value_changed.connect(func(v):
			value.image_id = int(v)
			update_image.call()
		)
		
		var label = Label.new()
		label.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
		label.text = "duration"
		
		var duration_edit = InspectorNumeric.numeric_edit(float(value.duration))
		duration_edit.value_changed.connect(func(v):
			value.duration = v
		)
		
		update_image.call()
		var box = HBoxContainer.new()
		node.add_child(box)
		box.add_child(id_edit)
		box.add_child(tex)
		box.add_child(label)
		box.add_child(duration_edit)
	)
	
static func supply_custom_properties(obj):
	if !data:
		return []
	if obj is CstcObjectType:
		return [{
			name = &'instances',
			getter = func(): return data.get_objects_by_type(obj.id),
		}]
	if obj is CstcImageMetadata:
		return [
			{
				name = &'width',
				getter = func(): return data.get_image(obj.id).get_width(),
			},
			{
				name = &'height',
				getter = func(): return data.get_image(obj.id).get_width(),
			}
		]
		
	return []

static func custom_get_control_for_property(obj, value, pinfo: PropertyInfo):
	## Objects in the inspector that already exist in the outliner become buttons that link to the outliner item
	if obj is CstcObjectInstance:
		if pinfo.name == &'object_type_id':
			return object_type_link(value, pinfo)
	var obj_pinfo = pinfo.parent
	if obj_pinfo != null:
		if obj_pinfo.parent != null:
			if obj_pinfo.parent.class_name == &'CstcObjectContainer':
				if obj_pinfo.name == &'object_ids':
					return object_type_link(value, pinfo)
			if obj_pinfo.parent.class_name == &'CstcObjectTrait':
				if obj_pinfo.name == &'object_type_ids':
					return object_type_link(value, pinfo)
			if obj_pinfo.parent.class_name == &'CstcFamily':
				if obj_pinfo.name == &'object_type_ids':
					return object_type_link(value, pinfo)
	if value is CstcAnimationFrame:
		return animation_frame(value, pinfo)
	if obj is CstcSpriteObjectData:
		if pinfo.name == &'animation':
			return animation_link(value, pinfo)
	if outliner.data_treeitem_map.has(value):
		var tree_item = outliner.data_treeitem_map[value]
		return outliner_link(value, pinfo, func(_id):
			return [
				value,
				tree_item.get_text(0)
			]
		)
static func supply_custom_property_info(obj, pinfo):
	# FIXME: sprite data may only link to top-level animation id
	# FIXME: edit animations at the object-type level (synchronized for all instances)
	var prop_name: String = pinfo.name
	
	
	# hide layout properties
	if obj is CstcAnimation:
		if prop_name in [&'is_angle', &'sub_animations']:
			return { hidden = true }
		if obj.is_angle:
			if prop_name in [&'name', &'tag']:
				return { hidden = true }
		elif obj.name == 'Animation':
			# The top-level animation (with is_angle: false and name "Animation")
			# just serves as a wrapper for all that object type's animations
			return { hidden = true }
		else:
			# Animations only have a name and a tag, the angle (exported into the sub-animations array) contains the rest of the data
			if !(prop_name in [&'name', &'tag']):
				return { hidden = true }

	if obj is CstcEvent or obj is CstcEventGroup or obj is CstcEventSheet:
		if prop_name == &'events':
			return { hidden = true }
	if obj is CstcLayout:
		if prop_name == &'layers' or prop_name == &'image_ids':
			return { hidden = true }
	if obj is CstcLayoutLayer:
		if prop_name == &'objects':
			return { hidden = true }
	if obj is CstcImageMetadata:
		if prop_name in [&'id', &'collision_width', &'collision_height', &'collision_pitch']:
			return { usage = PROPERTY_USAGE_DEFAULT | PROPERTY_USAGE_READ_ONLY }
		if prop_name == &'collision_mask':
			return { hidden = true }
	if obj is CstcSpriteObjectData:
		if prop_name == &'animation':
			return { usage = PROPERTY_USAGE_DEFAULT | PROPERTY_USAGE_READ_ONLY }

	if obj is CstcObjectInstance:
		# FIXME: hiding this property because i'm reconsidering on going the reference-holding route
		if prop_name == &'object_type':
			return { hidden = true }
	# type PrivateVariable dictionaries
	if obj is CstcFamily or obj is CstcObjectType:
		if prop_name == &'private_variables':
			return { values = [
				{
					type = TYPE_INT,
					hint = PROPERTY_HINT_ENUM,
					hint_string = "Integer:0,String:1",
				}
			]}
	if obj is CstcObjectType:
		# not editable data
		if prop_name == &'descriptors':
			return { hidden = true }
	if obj is CstcBehavior:
		if prop_name == &'descriptors':
			return { hidden = true }
	if obj is CstcAppBlock or obj is CstcLayout:
		if prop_name == &'data_keys':
			return { values = [
				{ type = TYPE_STRING },
				{ type = TYPE_INT },
			]}
	if obj is CstcFeatureDescriptors:
		return { values = [
			{ type = TYPE_INT }
		]}

