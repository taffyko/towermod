import { ModInfo } from "@towermod";
import { UniqueTowermodObject, findObjectTypeById, DataState } from "../redux/reducers/data";
import { assert, assertUnreachable, unwrap } from "./util";

export function objectDisplayName(data: DataState, obj: UniqueTowermodObject) {
	const objTypeName = obj._type
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

function uniqueName(mod: ModInfo | string) {
	if (typeof mod === 'string') {
		const [author, name] = mod.split('.')
		return `${author}.${name}`
	}
	if (mod.error) { return mod.filePath! }
	return `${mod.author}.${mod.name}`.toLowerCase().replace('_', '-');
}

function uniqueVersionName(mod: ModInfo) {
	if (mod.error) { return mod.filePath! }
	return `${mod.author}.${mod.name}.${mod.version}`.toLowerCase().replace('_', '-');
}

export function enhanceModInfo(modInfo: ModInfo): ModInfo {
	Object.assign(modInfo, {
		get uniqueName() { return uniqueName(modInfo) },
		get id() { return uniqueVersionName(modInfo) },
	})
	return modInfo
}

declare module "@towermod" {
	interface ModInfo {
		uniqueName: string
		id: string
	}
}
