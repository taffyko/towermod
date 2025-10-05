import type { LookupForType, ObjectForType, OutlinerTowermodObject, UniqueObjectLookup, UniqueObjectTypes, UniqueTowermodObject } from '@/util'
import { assertUnreachable, binaryInvoke, createObjectUrl, enhanceAnimation, enhanceAppBlock, enhanceBehavior, enhanceContainer, enhanceFamily, enhanceImageMetadata, enhanceLayout, enhanceLayoutLayer, enhanceObjectInstance, enhanceObjectTrait, enhanceObjectType, int, revokeObjectUrl } from "@/util"
import { getObjectDisplayName, getObjectStringId } from '@/util/dataUtil'
import { SkipToken } from '@tanstack/react-query'
import { invoke } from "@tauri-apps/api/core"
import { Animation, AppBlock, ImageMetadata, ObjectType, PluginData, SearchOptions } from '@towermod'
import { createMutation, createQuery, invalidate, queryClient, QueryDependency, whenQueryEvicted } from "./helpers"


const r = ['Game', 'Data']
export const tags = {
	data: r,
	image: {
		all: [...r, 'Image'],
		id: (id: int) => [...r, 'Image', 'id', id],
		url: (id: int) => [...r, 'Image', 'id', id, 'url'],
	},
	imageMetadata: {
		all: [...r, 'ImageMetadata'],
		id: (id: int) => [...r, 'ImageMetadata', 'id', id],
	},
	object: {
		id: (lookup: UniqueObjectLookup) => [...r, 'object', lookup],
		list: (type: UniqueObjectTypes, filters: object = {}) => [...r, 'object', { _type: type }, 'list', filters]
	}
}

export const getAppBlock = createQuery({
	queryFn: async () => enhanceAppBlock(await invoke<AppBlock>('get_app_block')),
	deps: () => [{ type: 'AppBlock', id: 'singleton' }]
})

export const getGameImageUrl = createQuery({
	queryFn: async (id: int) => {
		const arrayBuffer = await _getGameImage(id)
		let blob: Blob | null = null
		if (arrayBuffer) {
			blob = new Blob([arrayBuffer], { type: 'image/png' })
		}
		const url = blob && createObjectUrl(blob)
		if (url) {
			// BUG
			console.warn(`Creating object URL ${url} for image ${id}`)
			whenQueryEvicted(tags.image.url(id))
				.then(() => {
					console.warn(`REVOKING object URL ${url} for image ${id}`)
					revokeObjectUrl(url)
				})
		}
		return { url, imageId: id }
	},
	deps: (id) => [{ type: 'Image', id }]
})

export const getImageMetadata = createQuery({
	queryFn: async (id: int) => {
		const r: ImageMetadata = await invoke('get_image_metadata', { id })
		return enhanceImageMetadata(r)
	},
	deps: (id) => [towermodObjectToDep({ _type: 'ImageMetadata', id })],
})

export const setImageMetadata = createMutation({
	mutationFn: (data: ImageMetadata) => invoke('set_image_metadata', { data }),
	onMutate: async (data) => {
		const queryKey = getImageMetadata.queryKey(data.id)
		await queryClient.cancelQueries({ queryKey })
		const previousData = queryClient.getQueryData(queryKey)
		queryClient.setQueryData(queryKey, data)
		return previousData
	},
	onError: (_err, data, previousData) => {
		queryClient.setQueryData(tags.imageMetadata.id(data.id), previousData)
	},
	onSettled: (_r, _e, data) => invalidateTowermodObject(data)
})

export const isImageOverridden = createQuery({
	queryFn: (id: int) => invoke('is_image_overridden', { id }),
	deps: (id) => [{ type: 'Image', id }],
})

export const getEditorPlugin = createQuery({
	queryFn: (id: int) => invoke<PluginData>('get_editor_plugin', { id }),
	deps: [{ type: 'Data', id: 'singleton' }],
})

export const getEditorPlugins = createQuery({
	queryFn: () => invoke<Record<number, PluginData>>('get_editor_plugins'),
	deps: [{ type: 'Data', id: 'singleton' }],
})

export const getObjectTypes = createQuery({
	queryFn: async () => {
		const r: number[] = await invoke('get_object_types')
		return r.map(id => ({ id, _type: 'ObjectType' } as LookupForType<'ObjectType'>))
	},
	deps: [{ type: 'ObjectType' }],
})

export const searchObjectTypes = createQuery({
	queryFn: async (options: SearchOptions): Promise<{ _type: 'ObjectType', name: string, id: int }[]> => {
		const r: [number, string][] = await invoke('search_object_types', { options })
		return r.map(([id, name]) => ({ id, name, _type: 'ObjectType' as const }))
	},
	deps: [{ type: 'ObjectType' }],
})

export const getObjectTypeImageId = createQuery({
	queryFn: (id: int) => invoke<int | null>('get_object_type_image_id', { id }),
	deps: (id: int) => [towermodObjectToDep({ _type: 'ObjectType', id })]
})

export const createObjectType = createMutation({
	mutationFn: (pluginId: int) => invoke<int>('create_object_type', { pluginId }),
	onSuccess: () => invalidate('ObjectType', 'new')
})
export const validateObjectTypeName = createQuery({
	queryFn: (name: string) => {
		// FIXME
		return true
	},
	deps: [{ type: 'ObjectType' }],
})

export const deleteObjectType = createMutation({
	mutationFn: (id: int) => invoke('delete_object_type', { id }),
	onSuccess: (_r, id) => invalidateTowermodObject({ _type: 'ObjectType', id })
})

export const objectTypeAddVariable = createMutation({
	mutationFn: (args: { id: int, name: string, value: number | string }) => invoke('object_type_add_variable', args),
	onSettled: (_r, _e, arg) => invalidateTowermodObject({ _type: 'ObjectType', id: arg.id })
})

export const objectTypeDeleteVariable = createMutation({
	mutationFn: (args: { id: int, name: string }) => invoke('object_type_delete_variable', args),
	onSettled: (_r, _e, arg) => invalidateTowermodObject({ _type: 'ObjectType', id: arg.id })
})

export const getObjectInstances = createQuery({
	queryFn: async (layoutLayerId: int) => {
		const r: number[] = await invoke('get_object_instances', { layoutLayerId })
		return r.map(id => ({ id, _type: 'ObjectInstance' } as LookupForType<'ObjectInstance'>))
	},
	deps: (layoutLayerId) => [{ type: 'ObjectInstance', filter: { layoutLayerId } }],
})

export const searchObjectInstances = createQuery({
	queryFn: async (options: SearchOptions) => {
		const r: [number, string][] = await invoke('search_object_instances', { options })
		return r.map(([id, name]) => ({ id, name, _type: 'ObjectInstance' } as LookupForType<'ObjectInstance'>))
	},
	deps: (options) => [{ type: 'ObjectInstance', filter: options as any }],
})

export const getObjectTypeInstances = createQuery({
	queryFn: async (objectTypeId: int) => {
		const r: number[] = await invoke('get_object_type_instances', { objectTypeId })
		return r.map(id => ({ id, _type: 'ObjectInstance' } as LookupForType<'ObjectInstance'>))
	},
	deps: (objectTypeId: int) => [{ type: 'ObjectInstance', filter: { objectTypeId } }],
})

export const getObjectInstanceImageId = createQuery({
	queryFn: (id: int) => invoke<int | null>('get_object_instance_image_id', { id }),
	deps: (id) => [towermodObjectToDep({ _type: 'ObjectInstance', id })]
})

export const getLayouts = createQuery({
	queryFn: async () => {
		const r: string[] = await invoke('get_layouts')
		return r.map(name => ({ name, _type: 'Layout' } as LookupForType<'Layout'>))
	},
	deps: [{ type: 'Layout' }]
})

export const getLayoutLayers = createQuery({
	queryFn: async (layoutName: string) => {
		const r: number[] = await invoke('get_layout_layers', { layoutName })
		return r.map(id => ({ id, _type: 'LayoutLayer' } as LookupForType<'LayoutLayer'>))
	},
	deps: (layoutName) => [{ type: 'LayoutLayer', filter: { layoutName } }]
})

export const searchLayoutLayers = createQuery({
	queryFn: async (options: SearchOptions) => {
		const r: [number, string][] = await invoke('search_layout_layers', { options })
		return r.map(([id, name]) => ({ id, name, _type: 'LayoutLayer' } as LookupForType<'LayoutLayer'>))
	},
	deps: (options) => [{ type: 'LayoutLayer', filter: options as any }]
})

export const getOutlinerObjectTypes = createQuery({
	queryFn: async ({ page, pageSize }: { page: number, pageSize: number }) => {
		const r: [ObjectType, Animation | null][] = await invoke('get_outliner_object_types', { skip: page * pageSize, take: pageSize })
		return r.map(([obj, anim]) => (
			{ ...enhanceObjectType(obj), animation: enhanceAnimation(anim) ?? undefined }
		))
	},
	deps: [{ type: 'ObjectType' }, { type: 'Animation' }]
})

export const getOutlinerObjectTypeIcons = createQuery({
	queryFn: async ({ page, pageSize }: { page: number, pageSize: number }) => {
		const r: Array<null | [int, Uint8Array]> = await binaryInvoke('get_outliner_object_type_icons', [page * pageSize, pageSize])
		const data = r.map((o) => {
			let obj = {} as { url?: string, imageId?: int }
			if (!o) { return obj }
			const [imageId, data] = o
			const blob = new Blob([data], { type: 'image/png' })
			obj = { url: createObjectUrl(blob), imageId }
			// BUG: share cache entries with getGameImageUrl
			// queryClient.setQueryData(tags.image.url(imageId), url)
			// let it know not to revoke the object URLs prematurely when it evicts the cache
			return obj
		})
		const queryKey = getOutlinerObjectTypeIcons.queryKey({ page, pageSize })
		whenQueryEvicted(queryKey)
			.then(() => {
				for (const { url } of data) {
					if (url) {
						revokeObjectUrl(url)
					}
				}
			})
		return data
	},
	deps: [{ type: 'ObjectType' }, { type: 'Image' }, { type: 'Animation' }],
})

export const getOutlinerObjectData = createQuery({
	queryFn: async (args: {lookup: OutlinerTowermodObject | null, idx: number | null}, { hash }) => {
		const ctx = { parent: hash }
		const { lookup, idx } = args
		const data: {
			obj?: UniqueTowermodObject,
			hasIcon?: boolean,
			iconUrl?: string,
			displayName?: string,
			children?: OutlinerTowermodObject[],
		} = {}

		if (!lookup) { return data }
		// alternative fetch if possible
		let pageData: any[] | undefined
		let iconsPageData: { url?: string }[] | undefined
		if (idx != null) {
			const pageSize = 500
			const page = Math.floor(idx / pageSize)
			const idxInPage = idx % pageSize
			switch (lookup?._type) {
				case 'ObjectType': {
					pageData = await getOutlinerObjectTypes({ page, pageSize }, ctx)
					iconsPageData = await getOutlinerObjectTypeIcons({ page, pageSize }, ctx)
				}
			}
			if (pageData) { data.obj = pageData?.[idxInPage] }
			if (iconsPageData) { data.iconUrl = iconsPageData?.[idxInPage]?.url }
		}
		// fetch individual data generically if not handled above
		if (!pageData && !data.obj) { data.obj = await getTowermodObject(lookup, ctx) ?? undefined }
		if (!iconsPageData && !data.iconUrl) { data.iconUrl = await getTowermodObjectIconUrl(lookup, ctx) ?? undefined }

		// populate children/etc.
		const obj = data.obj
		switch (obj?._type) {
			case 'Animation': {
				data.hasIcon = true
				data.displayName = getObjectDisplayName(obj)
				data.children = obj.subAnimations
			} break; case 'ObjectType': {
				const isSprite = obj.pluginName === 'Sprite'
				data.hasIcon ||= isSprite
				data.displayName = getObjectDisplayName(obj)
				if (isSprite) {
					data.children = (obj as { animation?: Animation }).animation?.subAnimations
				}
			} break; case 'Layout': {
				data.children = await getLayoutLayers(obj.name, ctx)
			} break; case 'LayoutLayer': {
				data.children = await getObjectInstances(obj.id, ctx)
			}
		}

		if (!data.displayName) {
			data.displayName = await getTowermodObjectDisplayName(data.obj, ctx) ?? undefined
		}

		return data
	},
	argToKey: ({ idx, lookup }) => ({ idx, lookup: getObjectStringId(lookup) })
})

export const getOutlinerParentObject = createQuery({
	queryFn: async (arg: UniqueObjectLookup, { hash }) => {
		const ctx = { parent: hash }
		const obj = await getTowermodObject(arg, ctx)
		if (!obj) { return null }
		switch (obj._type) {
			case 'ObjectInstance': {
				return await getTowermodObject({ _type: 'LayoutLayer', id: obj.layoutLayerId }, ctx)
			} case 'LayoutLayer': {
				return await getTowermodObject({ _type: 'Layout', name: obj.layoutName }, ctx)
			} case 'Animation': {
				if (obj.parentAnimationId != null) {
					const parent = await getTowermodObject({ _type: 'Animation', id: obj.parentAnimationId }, ctx)
					if (parent?.parentObjectTypeId) {
						return await getTowermodObject({ _type: 'ObjectType', id: parent.parentObjectTypeId }, ctx)
					} else { return parent }
				}
			}
		}
		return null
	},
	argToKey: (arg) => getObjectStringId(arg)
})

export const getObjectTypeAnimation = createQuery({
	queryFn: async (arg: LookupForType<'ObjectType'>) => {
		const r: Animation = await invoke('get_object_type_animation', arg)
		return enhanceAnimation(r)
	},
	deps: (arg) => [towermodObjectToDep(arg)],
})

export const getRootAnimations = createQuery({
	queryFn: async () => {
		const r: number[] = await invoke('get_root_animations')
		return r.map(id => ({ id, _type: 'Animation' } as LookupForType<'Animation'>))
	},
	deps: [{ type: 'Animation', filter: { isRoot: true } }]
})

export const getAnimationChildren = createQuery({
	queryFn: async (id: int) => {
		const r: number[] = await invoke('get_animation_children', { id })
		return r.map(id => ({ id, _type: 'Animation' } as LookupForType<'Animation'>))
	},
	deps: [{ type: 'Animation', filter: { isRoot: true } }]
})

export const createAnimation = createMutation({
	mutationFn: (args: { objectTypeId: int }) => invoke<int>('create_animation', args),
	// onSuccess: (r, arg) => invalidate([{ type: 'ObjectType', id: String(arg.objectTypeId) }, r && { type: 'Animation', id: String(r) }])
	onSuccess: async (animationId, arg) => {
		await invalidateTowermodObject({ _type: 'ObjectType', id: arg.objectTypeId })
		await invalidateTowermodObject({ _type: 'Animation', id: animationId })
	}
})

export const getBehaviors = createQuery({
	queryFn: async () => {
		const r: [number, number][] = await invoke('get_behaviors')
		return r.map(([objectTypeId, movIndex]) => ({ objectTypeId, movIndex, _type: 'Behavior' } as LookupForType<'Behavior'>))
	},
	deps: [{ type: 'Behavior' }]
})

export const getContainers = createQuery({
	queryFn: async () => {
		const r: number[] = await invoke('get_containers')
		return r.map(id => ({ id, _type: 'Container' } as LookupForType<'Container'>))
	},
	deps: [{ type: 'Container' }]
})

export const searchContainers = createQuery({
	queryFn: async (options: SearchOptions) => {
		const r: [number, string][] = await invoke('search_containers', { options })
		return r.map(([id, name]) => ({ id, name, _type: 'Container' } as LookupForType<'Container'>))
	},
	deps: (options) => [{ type: 'Container', filter: options as any }]
})

export const getFamilies = createQuery({
	queryFn: async () => {
		const r: string[] = await invoke('get_families')
		return r.map(name => ({ name, _type: 'Family' } as LookupForType<'Family'>))
	},
	deps: [{ type: 'Family'}],
})

export const familyAddObject = createMutation({
	mutationFn: (args: { name: string, objectTypeId: int }) => invoke('family_add_object', args),
	onSuccess: (_r, args) => invalidateTowermodObject({ _type: 'Family', name: args.name })
})
export const validateFamilyName = createQuery({
	queryFn: (name: string) => {
		// FIXME
		return true
	},
	deps: [{ type: 'Family'}],
})

export const familyRemoveObject = createMutation({
	mutationFn: (args: { name: string, objectTypeId: int }) => invoke('family_remove_object', args),
	onSuccess: (_r, args) => invalidateTowermodObject({ _type: 'Family', name: args.name })
})

export const familyAddVariable = createMutation({
	mutationFn: (args: { name: string, varName: string, value: number | string }) => invoke('family_add_variable', args),
	onSuccess: (_r, args) => invalidateTowermodObject({ _type: 'Family', name: args.name })
})

export const familyDeleteVariable = createMutation({
	mutationFn: (args: { name: string, varName: string }) => invoke('family_delete_variable', args),
	onSuccess: (_r, args) => invalidateTowermodObject({ _type: 'Family', name: args.name })
})

export const createFamily = createMutation({
	mutationFn: (name: string) => invoke('create_family', { name }),
	onSuccess: (_r, arg) => invalidateTowermodObject({ _type: 'Family', name: arg })
})

export const getObjectTraits = createQuery({
	queryFn: async () => {
		const r: string[] = await invoke('get_traits')
		return r.map(name => ({ name, _type: 'ObjectTrait' } as LookupForType<'ObjectTrait'>))
	},
	deps: [{ type: 'ObjectTrait' }]
})

export const createObjectTrait = createMutation({
	mutationFn: (name: string) => invoke('create_trait', { name }),
	onSuccess: (_r, arg) => invalidateTowermodObject({ _type: 'ObjectTrait', name: arg })
})

export const _getTowermodObject = createQuery({
	queryFn: async (lookup: UniqueObjectLookup): Promise<UniqueTowermodObject | null> => {
		return await _getTowermodObject_impl(lookup)
	},
	deps: (lookup, r) => {
		const deps = [towermodObjectToDep(lookup)]
		// invalidate when sub-animations change
		if (r && r._type === 'Animation') {
			function recurse(anim: Animation) {
				deps.push(towermodObjectToDep({ _type: 'Animation', id: anim.id }))
				for (const subAnimation of anim.subAnimations) {
					deps.push(towermodObjectToDep(subAnimation))
					recurse(subAnimation)
				}
			}
			recurse(r)
		}
		return deps
	},
	argToKey: (arg) => arg && getObjectStringId(arg)
})
// wrapper with nice generic typing
export function getTowermodObject<T extends UniqueObjectTypes>(arg: LookupForType<T>, context?: any): Promise<ObjectForType<T> | null> {
	return _getTowermodObject(arg, context) as any
}
getTowermodObject.useQuery = <T extends UniqueObjectTypes>(arg: LookupForType<T> | SkipToken): { data: ObjectForType<T> | null | undefined } => {
	return _getTowermodObject.useQuery(arg) as any
}

export const getTowermodObjectDisplayName = createQuery({
	queryFn: async (lookup: UniqueObjectLookup | null | undefined, { hash }): Promise<string | null> => {
		const ctx = { parent: hash }
		const obj = lookup && await getTowermodObject(lookup, ctx)
		if (obj == null) { return null }
		switch (obj._type) {
			case 'ObjectInstance': {
				const objType = await getTowermodObject({ _type: 'ObjectType', id: obj.objectTypeId }, ctx)
				const plugin = objType && await getEditorPlugin(objType.pluginId, ctx)
				const pluginName = plugin?.stringTable?.name
				return `Instance: ${pluginName} (${objType?.name}: ${obj.id})`
			} case 'Container': {
				const objType = await getTowermodObject({ _type: 'ObjectType', id: obj.id }, ctx)
				return `Container: ${objType?.name}`
			}
		}
		return getObjectDisplayName(obj)
	},
	argToKey: (arg) => arg && getObjectStringId(arg)
})

export const getTowermodObjectIconUrl = createQuery({
	queryFn: async (lookup: UniqueObjectLookup, { hash }): Promise<string | null> => {
		const ctx = { parent: hash }
		const obj = await getTowermodObject(lookup, ctx)
		if (!obj) { return null }
		let imageId: int | null = null
		switch (obj._type) {
			case 'ObjectType': {
				imageId = await getObjectTypeImageId(obj.id, ctx)
			} break; case 'Container': {
				imageId = await getObjectTypeImageId(obj.id, ctx)
			} break; case 'Behavior': {
				imageId = await getObjectTypeImageId(obj.objectTypeId, ctx)
			} break; case 'ObjectInstance': {
				imageId = await getObjectTypeImageId(obj.objectTypeId, ctx)
			} break; case 'ImageMetadata': {
				imageId = obj.id
			} break; case 'Animation': {
				const animation = await getTowermodObject({ _type: 'Animation', id: obj.id }, ctx)
				if (animation) {
					const a = animation.isAngle ? animation : animation.subAnimations[0]
					imageId = a.frames[0]?.imageId
				}
			}
		}
		if (imageId == null) { return null }
		const { url } = await getGameImageUrl(imageId, ctx)
		return url
	},
	argToKey: (arg) => getObjectStringId(arg)
})

export const updateTowermodObject = createMutation({
	mutationFn: (obj: UniqueTowermodObject) => _updateTowermodObject(obj),
	onSuccess: (_r, obj) => invalidateTowermodObject(obj)
})

export const deleteTowermodObject = createMutation({
	mutationFn: (lookup: UniqueObjectLookup) => _deleteTowermodObject(lookup),
	onSuccess: (_r, lookup) => invalidateTowermodObject(lookup)
})

function towermodObjectToDep(lookup: UniqueObjectLookup): QueryDependency & { id: unknown } {
	return { type: lookup._type, id: getObjectStringId(lookup) }
}
export function invalidateTowermodObject(lookup: UniqueObjectLookup) {
	const { type, id } = towermodObjectToDep(lookup)
	return invalidate(type, id)
}

async function _getTowermodObject_impl(lookup: UniqueObjectLookup): Promise<UniqueTowermodObject | null> {
	const type = lookup._type
	switch (type) {
		case 'ObjectType': return enhanceObjectType(await invoke('get_object_type', lookup))
		case 'ObjectInstance': return enhanceObjectInstance(await invoke('get_object_instance', lookup))
		case 'Container': return enhanceContainer(await invoke('get_container', lookup))
		case 'Animation': return enhanceAnimation(await invoke('get_animation', lookup))
		case 'Behavior': return enhanceBehavior(await invoke('get_behavior', lookup))
		case 'Family': return enhanceFamily(await invoke('get_family', lookup))
		case 'ObjectTrait': return enhanceObjectTrait(await invoke('get_trait', lookup))
		case 'AppBlock': return enhanceAppBlock(await invoke('get_app_block'))
		case 'Layout': return enhanceLayout(await invoke('get_layout', lookup))
		case 'LayoutLayer': return enhanceLayoutLayer(await invoke('get_layout_layer', lookup))
		case 'ImageMetadata': return enhanceImageMetadata(await invoke('get_image_metadata', { id: lookup.id }))
		default: assertUnreachable(type)
	}
}

async function _updateTowermodObject(obj: UniqueTowermodObject): Promise<void> {
	const type = obj._type
	switch (type) {
		case 'ObjectType': return await invoke('update_object_type', { obj })
		case 'ObjectInstance': return await invoke('update_object_instance', { obj })
		case 'Container': return await invoke('update_container', { container: obj })
		/// TODO: include objectTypeId on Animations and invalidate the corresponding object type
		case 'Animation': return await invoke('update_animation', { animation: obj })
		case 'Behavior': return await invoke('update_behavior', { behavior: obj })
		case 'Family': return await invoke('update_family', { family: obj })
		case 'ObjectTrait': return await invoke('update_trait', { objectTrait: obj })
		case 'AppBlock': return await invoke('update_app_block', { appBlock: obj })
		case 'Layout': return await invoke('update_layout', { layout: obj })
		case 'LayoutLayer': return await invoke('update_layout_layer', { layer: obj })
		case 'ImageMetadata': return await invoke('set_image_metadata', { data: obj })
		default: assertUnreachable(type)
	}
}

async function _deleteTowermodObject(lookup: UniqueObjectLookup): Promise<void> {
	const type = lookup._type
	switch (type) {
		case 'ObjectType': return await invoke('delete_object_type', lookup)
		case 'ObjectInstance': return await invoke('delete_object_instance', lookup)
		case 'Container': return await invoke('delete_container', lookup)
		case 'Animation': return await invoke('delete_animation', lookup)
		case 'Behavior': return await invoke('delete_behavior', lookup)
		case 'Family': return await invoke('delete_family', lookup)
		case 'ObjectTrait': return await invoke('delete_trait', lookup)
		case 'AppBlock': return await invoke('delete_app_block', lookup)
		case 'Layout': return await invoke('delete_layout', lookup)
		case 'LayoutLayer': return await invoke('delete_layout_layer', lookup)
		case 'ImageMetadata': return await invoke('delete_image_metadata', lookup)
		default: assertUnreachable(type)
	}
}

async function _getGameImage(id: int): Promise<Uint8Array | null> {
	const enc = new TextEncoder()
	const bytes = enc.encode(JSON.stringify(id))
	const resp = new Uint8Array(await invoke("get_image", bytes))
	if (!resp.length) {
		return null
	}
	return resp
}
