import { UniqueTowermodObject, findObjectTypeById, State } from "./reducers/data";
import { assert, assertUnreachable, unwrap } from "./util";

export function objectDisplayName(data: State, obj: UniqueTowermodObject) {
	const objTypeName = obj.type
	switch (objTypeName) {
		case 'Layout':
			return `Layout: ${obj.name}`
		case 'LayoutLayer':
			return `Layer ${obj.id}: ${obj.name}`
		case 'ObjectInstance': {
			const objType = unwrap(findObjectTypeById(data, obj.objectTypeId))
			const plugin = data.editorPlugins[objType.pluginId]
			const pluginName = plugin.stringTable.name
			const objectName = objType.name
			return `Instance: ${pluginName} (${objectName}: ${obj.id})`
		} case 'Animation':
			// TODO: animations
			return `Animation ${obj.id}`
		case 'Behavior':
			return `Behavior: ${obj.name}`
		case 'Container':
			const objType = unwrap(findObjectTypeById(data, obj.objectIds[0]))
			return `Container: ${objType.name}`
		case 'Family':
			return `Family: ${obj.name}`
		case 'ObjectType': {
			const plugin = data.editorPlugins[obj.pluginId]
			const pluginName = plugin.stringTable.name
			return `Type ${obj.id}: (${pluginName}: ${obj.name})`
		} case 'ObjectTrait':
			return `Trait: ${obj.name}`
		case 'AppBlock':
			return 'Project Settings'
		default:
			assertUnreachable(objTypeName)
	}

}
