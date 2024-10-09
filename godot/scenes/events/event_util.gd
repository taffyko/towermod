extends Node

const EventCondition = preload("./event_condition.tscn")
const EventAction = preload("./event_action.tscn")
const EventGroup = preload("./event_group.tscn")
const Event = preload("./event.tscn")

static func node_for_element(obj):
	var node = null
	if obj is CstcEvent:
		node = Event.instantiate()
	elif obj is CstcEventAction:
		node = EventAction.instantiate()
	elif obj is CstcEventCondition:
		node = EventCondition.instantiate()
	elif obj is CstcEventGroup:
		node = EventGroup.instantiate()
	if node:
		node.data = obj
	return node
