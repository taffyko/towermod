import { ModInfo, Animation, Layout, ObjectInstance, Behavior, Container, Family, ObjectType, ObjectTrait, AppBlock, LayoutLayer, ImageMetadata } from "@towermod";
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
			return `Animation ${obj.id}: ${obj.name}`
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

export function enhanceLayout(layout: Layout): Layout {
	layout._type = 'Layout'
	for (const layer of layout.layers) {
		enhanceLayoutLayer(layer)
	}
	return layout
}

export function enhanceLayoutLayer(layer: LayoutLayer): LayoutLayer {
	layer._type = 'LayoutLayer'
	for (const obj of layer.objects) {
		enhanceObjectInstance(obj)
	}
	return layer
}

export function enhanceObjectInstance(obj: ObjectInstance): ObjectInstance {
	obj._type = 'ObjectInstance'
	return obj
}

export function enhanceAnimation(animation: Animation): Animation {
	animation._type = 'Animation'
	for (const frame of animation.frames) {
		frame._type = 'AnimationFrame'
	}
	for (const subAnimation of animation.subAnimations) {
		enhanceAnimation(subAnimation)
	}
	return animation
}

export function enhanceBehavior(behavior: Behavior): Behavior {
	behavior._type = 'Behavior'
	return behavior
}

export function enhanceContainer(container: Container): Container {
	container._type = 'Container'
	return container
}

export function enhanceFamily(family: Family): Family {
	family._type = 'Family'
	return family
}

export function enhanceObjectType(objType: ObjectType): ObjectType {
	objType._type = 'ObjectType'
	for (const privateVariable of objType.privateVariables) {
		privateVariable._type = 'PrivateVariable'
	}
	return objType
}

export function enhanceObjectTrait(trait: ObjectTrait): ObjectTrait {
	trait._type = 'ObjectTrait'
	return trait
}

export function enhanceAppBlock(appBlock: AppBlock): AppBlock {
	appBlock._type = 'AppBlock'
	return appBlock
}

export function enhanceImageMetadata(imageMetadata: ImageMetadata): ImageMetadata {
	imageMetadata._type = 'ImageMetadata'
	for (const actionPoint of imageMetadata.apoints) {
		actionPoint._type = 'ActionPoint'
	}
	return imageMetadata
}


declare module "@towermod" {
	interface ModInfo {
		uniqueName: string
		id: string
	}
}
