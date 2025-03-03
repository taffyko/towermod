import { ModInfo, Animation, Layout, ObjectInstance, Behavior, Container, Family, ObjectType, ObjectTrait, AppBlock, LayoutLayer, ImageMetadata, CstcData, TextObjectData, SpriteObjectData, AnimationFrame, ActionPoint, BehaviorControl, GlobalVariable } from "@towermod";

export type TowermodObject = Layout | LayoutLayer | ObjectInstance | Animation | Behavior | Container | Family | ObjectType | ObjectTrait | AppBlock | AnimationFrame | ImageMetadata | ActionPoint | BehaviorControl | GlobalVariable
	| TextObjectData | SpriteObjectData

export const uniqueObjectTypes = new Set([
	'Layout', 'LayoutLayer', 'ObjectInstance', 'Animation', 'Behavior', 'Container', 'Family', 'ObjectType', 'ObjectTrait', 'AppBlock'
] as const)
export type UniqueObjectTypes = (typeof uniqueObjectTypes) extends Set<infer T> ? T : never
/** Towermod objects that possess unique IDs, making it possible to look them up */
export type UniqueTowermodObject = Extract<TowermodObject, { _type: UniqueObjectTypes }>
/** Minimum properties needed to lookup each object (type and primary key) */
export type UniqueObjectLookup =
	Pick<Layout, '_type' | 'name'>
	| Pick<LayoutLayer, '_type' | 'id'>
	| Pick<ObjectInstance, '_type' | 'id'>
	| Pick<Animation, '_type' | 'id'>
	| Pick<Behavior, '_type' | 'movIndex' | 'objectTypeId'>
	| Pick<Container, '_type' | 'objectIds'>
	| Pick<Family, '_type' | 'name'>
	| Pick<ObjectType, '_type' | 'id'>
	| Pick<ObjectTrait, '_type' | 'name'>
	| Pick<AppBlock, '_type'>
export type ObjectForType<T extends TowermodObject['_type']> = Extract<TowermodObject, { _type: T }>
export type LookupForType<T extends UniqueObjectLookup['_type']> = Extract<UniqueObjectLookup, { _type: T }>


export function getUniqueName(author: string, name: string) : string
export function getUniqueName(mod: ModInfo | string): string
export function getUniqueName(a: any, b?: string)
{
	if (b !== undefined) { return _getUniqueName(a, b) }
	const mod = a;
	if (typeof mod === 'string') {
		const [author, name] = mod.split('.')
		return `${author}.${name}`
	}
	if (mod.error) { return mod.filePath! }
	return _getUniqueName(mod.author, mod.name)
}
function _getUniqueName(author: string, name: string) {
	return `${author}.${name}`.toLowerCase().replace(/_ /, '-');
}

function getUniqueVersionName(mod: ModInfo) {
	if (mod.error) { return mod.filePath! }
	return `${mod.author}.${mod.name}.${mod.version}`.toLowerCase().replace(/_ /, '-');
}

export function enhanceModInfo(modInfo: ModInfo): ModInfo {
	Object.assign(modInfo, {
		get uniqueName() { return getUniqueName(modInfo) },
		get id() { return getUniqueVersionName(modInfo) },
	})
	return modInfo
}

export function enhanceLayout(layout: Layout): Layout {
	layout._type = 'Layout'
	// @ts-ignore
	delete layout.layers;
	return layout
}

export function enhanceLayoutLayer(layer: LayoutLayer): LayoutLayer {
	layer._type = 'LayoutLayer'
	// @ts-ignore
	delete layer.objects;
	return layer
}

export function enhanceObjectInstance(obj: ObjectInstance): ObjectInstance {
	obj._type = 'ObjectInstance'
	if (!(obj.data instanceof Array)) {
		if ('animation' in obj.data) { obj.data._type = 'SpriteObjectData' }
		if ('fontFace' in obj.data) { obj.data._type = 'TextObjectData' }
	}
	return obj
}

export function enhanceAnimation<T extends Animation>(animation: T): T {
	if (!animation) { return animation }
	animation._type = 'Animation'
	// @ts-ignore
	delete animation.subAnimations;
	for (const frame of animation.frames) {
		frame._type = 'AnimationFrame'
	}
	return animation
}

export function enhanceBehavior<T extends Behavior>(behavior: T): T {
	if (!behavior) { return behavior }
	behavior._type = 'Behavior'
	return behavior
}

export function enhanceContainer<T extends Container>(container: T): T {
	if (!container) { return container }
	container._type = 'Container'
	return container
}

export function enhanceFamily<T extends Family>(family: T): T {
	if (!family) { return family }
	family._type = 'Family'
	return family
}

export function enhanceObjectType<T extends ObjectType>(objType: T): T {
	if (!objType) { return objType }
	objType._type = 'ObjectType'
	return objType
}

export function enhanceObjectTrait<T extends ObjectTrait>(trait: T): T {
	if (!trait) { return trait }
	trait._type = 'ObjectTrait'
	return trait
}

export function enhanceAppBlock<T extends AppBlock>(appBlock: T): T {
	if (!appBlock) { return appBlock }
	appBlock._type = 'AppBlock'
	return appBlock
}

export function enhanceImageMetadata<T extends ImageMetadata>(imageMetadata: T): T {
	if (!imageMetadata) { return imageMetadata }
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
