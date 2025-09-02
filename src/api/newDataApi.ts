import type { LookupForType, UniqueObjectLookup, UniqueObjectTypes, UniqueTowermodObject } from '@/util'
import { assertUnreachable, binaryInvoke, createObjectUrl, enhanceAnimation, enhanceAppBlock, enhanceBehavior, enhanceContainer, enhanceFamily, enhanceImageMetadata, enhanceLayout, enhanceLayoutLayer, enhanceObjectInstance, enhanceObjectTrait, enhanceObjectType, int, revokeObjectUrl } from "@/util"
import { invoke } from "@tauri-apps/api/core"
import { Animation, ImageMetadata, ObjectType, SearchOptions } from '@towermod'
import { createMutation, createQuery, invalidate, queryClient, whenQueryEvicted } from "./helpers"


const r = ['Game', 'Data']
const tags = {
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

// getGameImageUrl: builder.query<{ url: string | null }, number>({
// 	query: async (id) => {
// 		const arrayBuffer = await _getGameImage(id)
// 		let blob: Blob | null = null
// 		if (arrayBuffer) {
// 			blob = new Blob([arrayBuffer], { type: 'image/png' })
// 		}
// 		return { url: blob && createObjectUrl(blob) }
// 	},
// 	providesTags: (_r, _e, arg) => [{ type: 'Image', id: String(arg) }],
// 	onCacheEntryAdded: async (_arg, cacheApi) => {
// 		const info = await cacheApi.cacheDataLoaded
// 		if (!info.data?.url) { return }
// 		// revoke the object URL (unless cache data was upserted from another query)
// 		if (!('_shared' in info.data)) {
// 			await cacheApi.cacheEntryRemoved
// 			revokeObjectUrl(info.data.url)
// 		}
// 	},
// }),

export const getGameImageUrl = createQuery({
	queryFn: async (id: int) => {
		const arrayBuffer = await _getGameImage(id)
		let blob: Blob | null = null
		if (arrayBuffer) {
			blob = new Blob([arrayBuffer], { type: 'image/png' })
		}
		const url = blob && createObjectUrl(blob)
		if (url) {
			// FIXME
			console.warn(`Creating object URL ${url} for image ${id}`)
			whenQueryEvicted(tags.image.url(id))
				.then(() => {
					// FIXME
					console.warn(`REVOKING object URL ${url} for image ${id}`)
					revokeObjectUrl(url)
				})
		}
		return { url, imageId: id }
	},
	queryKey: tags.image.url,
})

// getImageMetadata: builder.query<ImageMetadata | null, { id: number }>({
// 	query: (arg) => invoke('get_image_metadata', arg),
// 	transformResponse: (r: ImageMetadata) => enhanceImageMetadata(r),
// 	providesTags: (_r, _e, arg) => [{ type: 'ImageMetadata', id: String(arg.id) }]
// }),
export const getImageMetadata = createQuery({
	queryFn: async (arg: { id: int }) => {
		const r: ImageMetadata = await invoke('get_image_metadata', arg)
		return enhanceImageMetadata(r)
	},
	queryKey: ({ id }) => tags.imageMetadata.id(id),
})

// setImageMetadata: builder.mutation<void, ImageMetadata>({
// 	query: (data) => invoke('set_image_metadata', { data }),
// 	invalidatesTags: (_r, _e, arg) => [{ type: 'ImageMetadata', id: String(arg.id) }]
// }),
export const setImageMetadata = createMutation({
	mutationFn: (data: ImageMetadata) => invoke('set_image_metadata', { data }),
	onMutate: async (data) => {
		const queryKey = tags.imageMetadata.id(data.id)
		await queryClient.cancelQueries({ queryKey })
		const previousData = queryClient.getQueryData(queryKey)
		queryClient.setQueryData(queryKey, data)
		return previousData
	},
	onError: (_err, data, previousData) => {
		queryClient.setQueryData(tags.imageMetadata.id(data.id), previousData)
	},
	onSettled: (_r, _e, data) => invalidate(tags.imageMetadata.id(data.id))
})

// isImageOverridden: builder.query<boolean, number>({
// 	query: (id) => invoke('is_image_overridden', { id }),
// 	providesTags: (_r, _e, arg) => [{ type: 'Image', id: String(arg) }]
// }),
export const isImageOverridden = createQuery({
	queryFn: (id: int) => invoke('is_image_overridden', { id }),
	queryKey: (id) => [...tags.image.id(id), 'isOverridden'],
})

// getEditorPlugin: builder.query<PluginData, number>({
// 	query: (id) => invoke('get_editor_plugin', { id }),
// 	providesTags: ['Data']
// }),
export const getEditorPlugin = createQuery({
	queryFn: (id: int) => invoke('get_editor_plugin', { id }),
	queryKey: tags.data,
})

// getEditorPlugins: builder.query<Record<number, PluginData>, void>({
// 	query: () => invoke('get_editor_plugins'),
// 	providesTags: ['Data']
// }),
export const getEditorPlugins = createQuery({
	queryFn: () => invoke('get_editor_plugins'),
	queryKey: tags.data,
})

// getObjectTypes: builder.query<Lookup<ObjectType>[], void>({
// 	query: () => invoke('get_object_types'),
// 	transformResponse: (r: number[]) => r.map(id => ({ id, _type: 'ObjectType' })),
// 	providesTags: [{ type: 'ObjectType', id: 'LIST' }]
// }),
export const getObjectTypes = createQuery({
	queryFn: async () => {
		const r: number[] = await invoke('get_object_types')
		return r.map(id => ({ id, _type: 'ObjectType' } as LookupForType<'ObjectType'>))
	},
	queryKey: tags.object.list('ObjectType'),
})

// searchObjectTypes: builder.query<{ _type: 'ObjectType', name: string, id: int }[], SearchOptions>({
// 	query: (options) => invoke('search_object_types', { options }),
// 	transformResponse: (r: [number, string][]) => r.map(([id, name]) => ({ id, name, _type: 'ObjectType' })),
// 	providesTags: [{ type: 'ObjectType', id: 'LIST' }]
// }),
export const searchObjectTypes = createQuery({
	queryFn: async (options: SearchOptions) => {
		const r: [number, string][] = await invoke('search_object_types', { options })
		return r.map(([id, name]) => ({ id, name, _type: 'ObjectType' } as LookupForType<'ObjectType'>))
	},
	queryKey: (options: SearchOptions) => tags.object.list('ObjectType', options),
})

// getObjectTypeImageId: builder.query<int | null, int>({
// 	query: (id) => invoke('get_object_type_image_id', { id }),
// 	providesTags: (_r, _e, arg) => [{ type: 'Image', id: String(arg) }]
// }),
export const getObjectTypeImageId = createQuery({
	queryFn: (id: int) => invoke('get_object_type_image_id', { id }),
	queryKey: (id: int) => [...tags.object.id({ _type: 'ObjectType', id }), 'imageId'],
})

// createObjectType: builder.mutation<int, { pluginId: int }>({
// 	query: (pluginId) => invoke('create_object_type', { pluginId }),
// 	invalidatesTags: (_r, _e, id) => [{ type: 'ObjectType', id: String(id) }, { type: 'ObjectType', id: 'LIST' }]
// }),
export const createObjectType = createMutation({
	mutationFn: (pluginId: int) => invoke('create_object_type', { pluginId }),
	onSuccess: () => invalidate(tags.object.list('ObjectType'))
})

// deleteObjectType: builder.mutation<void, int>({
// 	query: (id) => invoke('delete_object_type', { id }),
// 	invalidatesTags: (_r, _e, id) => [{ type: 'ObjectType', id: String(id) }, { type: 'ObjectType', id: 'LIST' }]
// }),
export const deleteObjectType = createMutation({
	mutationFn: (id: int) => invoke('delete_object_type', { id }),
	onSuccess: () => invalidate(tags.object.list('ObjectType'))
})

// objectTypeAddVariable: builder.mutation<void, { id: int, name: string, value: number | string }>({
// 	query: (args) => invoke('object_type_add_variable', args),
// 	invalidatesTags: (_r, _e, arg) => [{ type: 'ObjectType', id: String(arg.id) }]
// }),
export const objectTypeAddVariable = createMutation({
	mutationFn: (args: { id: int, name: string, value: number | string }) => invoke('object_type_add_variable', args),
	onSettled: (_r, _e, arg) => invalidate(tags.object.id({ _type: 'ObjectType', id: arg.id }))
})

// objectTypeDeleteVariable: builder.mutation<void, { id: int, name: string }>({
// 	query: (args) => invoke('object_type_delete_variable', args),
// 	invalidatesTags: (_r, _e, arg) => [{ type: 'ObjectType', id: String(arg.id) }]
// }),
export const objectTypeDeleteVariable = createMutation({
	mutationFn: (args: { id: int, name: string }) => invoke('object_type_delete_variable', args),
	onSettled: (_r, _e, arg) => invalidate(tags.object.id({ _type: 'ObjectType', id: arg.id }))
})

// getObjectInstances: builder.query<Lookup<ObjectInstance>[], number>({
// 	query: (layoutLayerId) => invoke('get_object_instances', { layoutLayerId }),
// 	transformResponse: (r: number[]) => r.map(id => ({ id, _type: 'ObjectInstance' })),
// 	providesTags: ['ObjectInstance']
// }),
export const getObjectInstances = createQuery({
	queryFn: async (layoutLayerId: int) => {
		const r: number[] = await invoke('get_object_instances', { layoutLayerId })
		return r.map(id => ({ id, _type: 'ObjectInstance' } as LookupForType<'ObjectInstance'>))
	},
	queryKey: (layoutLayerId: int) => tags.object.list('ObjectInstance', { layoutLayerId }),
})

// searchObjectInstances: builder.query<{ _type: 'ObjectInstance', name: string, id: int }[], SearchOptions>({
// 	query: (options) => invoke('search_object_instances', { options }),
// 	transformResponse: (r: [number, string][]) => r.map(([id, name]) => ({ id, name, _type: 'ObjectInstance' })),
// 	providesTags: [{ type: 'ObjectType', id: 'LIST' }]
// }),
export const searchObjectInstances = createQuery({
	queryFn: async (options: SearchOptions) => {
		const r: [number, string][] = await invoke('search_object_instances', { options })
		return r.map(([id, name]) => ({ id, name, _type: 'ObjectInstance' } as LookupForType<'ObjectInstance'>))
	},
	queryKey: (options: SearchOptions) => tags.object.list('ObjectInstance', options),
})

// getObjectTypeInstances: builder.query<Lookup<ObjectInstance>[], number>({
// 	query: (objectTypeId) => invoke('get_object_type_instances', { objectTypeId }),
// 	transformResponse: (r: number[]) => r.map(id => ({ id, _type: 'ObjectInstance' })),
// 	providesTags: ['ObjectInstance']
// }),
export const getObjectTypeInstances = createQuery({
	queryFn: async (objectTypeId: int) => {
		const r: number[] = await invoke('get_object_type_instances', { objectTypeId })
		return r.map(id => ({ id, _type: 'ObjectInstance' } as LookupForType<'ObjectInstance'>))
	},
	queryKey: (objectTypeId: int) => tags.object.list('ObjectInstance', { objectTypeId }),
})

// getObjectInstanceImageId: builder.query<int | null, int>({
// 	query: (id) => invoke('get_object_instance_image_id', { id }),
// 	providesTags: (_r, _e, arg) => [{ type: 'Image', id: String(arg) }]
// }),
export const getObjectInstanceImageId = createQuery({
	queryFn: (id: int) => invoke('get_object_instance_image_id', { id }),
	queryKey: (id: int) => [...tags.object.id({ _type: 'ObjectInstance', id }), 'imageId'],
})

// getLayouts: builder.query<Lookup<Layout>[], void>({
// 	query: () => invoke('get_layouts'),
// 	transformResponse: (r: string[]) => r.map(name => ({ name, _type: 'Layout' })),
// 	providesTags: ['Layout']
// }),
export const getLayouts = createQuery({
	queryFn: async () => {
		const r: string[] = await invoke('get_layouts')
		return r.map(name => ({ name, _type: 'Layout' } as LookupForType<'Layout'>))
	},
	queryKey: tags.object.list('Layout'),
})

export const getLayoutLayers = createQuery({
	queryFn: async (layoutName: string) => {
		const r: number[] = await invoke('get_layout_layers', { layoutName })
		return r.map(id => ({ id, _type: 'LayoutLayer' } as LookupForType<'LayoutLayer'>))
	},
	queryKey: (layoutName: string) => tags.object.list('LayoutLayer', { layoutName }),
})

// searchLayoutLayers: builder.query<{ _type: 'LayoutLayer', name: string, id: int }[], SearchOptions>({
// 	query: (options) => invoke('search_layout_layers', { options }),
// 	transformResponse: (r: [number, string][]) => r.map(([id, name]) => ({ id, name, _type: 'LayoutLayer' })),
// 	providesTags: [{ type: 'LayoutLayer', id: 'LIST' }]
// }),
export const searchLayoutLayers = createQuery({
	queryFn: async (options: SearchOptions) => {
		const r: [number, string][] = await invoke('search_layout_layers', { options })
		return r.map(([id, name]) => ({ id, name, _type: 'LayoutLayer' } as LookupForType<'LayoutLayer'>))
	},
	queryKey: (options: SearchOptions) => tags.object.list('LayoutLayer', options),
})

// getOutlinerObjectTypes: builder.query<Array<ObjectType & { animation?: Animation }>, { page: number, pageSize: number }>({
// 	query: ({ page, pageSize }) => invoke('get_outliner_object_types', { skip: page * pageSize, take: pageSize}),
// 	transformResponse: (r: [ObjectType, Animation | null][]) => r.map(([obj, anim]) => (
// 		{ ...enhanceObjectType(obj), animation: enhanceAnimation(anim) ?? undefined }
// 	)),
// 	providesTags: (r) => r
// 		? r.map((obj) => ({ type: 'ObjectType', id: String(obj.id) }))
// 		: ['ObjectType']
// }),
export const getOutlinerObjectTypes = createQuery({
	queryFn: async ({ page, pageSize }: { page: number, pageSize: number }) => {
		const r: [ObjectType, Animation | null][] = await invoke('get_outliner_object_types', { skip: page * pageSize, take: pageSize })
		return r.map(([obj, anim]) => (
			{ ...enhanceObjectType(obj), animation: enhanceAnimation(anim) ?? undefined }
		))
	},
	queryKey: ({ page, pageSize }: { page: number, pageSize: number }) => [...tags.object.list('ObjectType'), 'getOutlinerObjectTypes', { page, pageSize }],
})

// getOutlinerObjectTypeIcons: builder.query<Array<{ url: undefined, imageId: undefined } | { url: string, imageId: int }>, { page: number, pageSize: number }>({
// 	query: ({ page, pageSize }) => binaryInvoke('get_outliner_object_type_icons', [page * pageSize, pageSize]),
// 	transformResponse: (r: Array<null | [int, Uint8Array]>) => {
// 		return r.map((o) => {
// 			if (!o) { return {} }
// 			const [imageId, data] = o
// 			const blob = new Blob([data], { type: 'image/png' })
// 			return { url: createObjectUrl(blob), imageId }
// 		})
// 	},
// 	providesTags: ['ObjectType', 'Image'],
// 	onCacheEntryAdded: async (_arg, cacheApi) => {
// 		const info = await cacheApi.cacheDataLoaded
// 		if (!info.data) { return }
// 		const { api } = await import('.')
// 		for (const img of info.data) {
// 			// share cache entries with getGameImageUrl
// 			if (img.url) {
// 				// let it know not to revoke the object URLs prematurely when it evicts the cache
// 				const record = { url: img.url, _shared: true }
// 				api.util.upsertQueryData('getGameImageUrl', img.imageId, record)
// 			}
// 		}
// 		await cacheApi.cacheEntryRemoved

// 		for (const { url } of info.data) {
// 			if (url) {
// 				revokeObjectUrl(url)
// 			}
// 		}
// 	},
// }),
export const getOutlinerObjectTypeIcons = createQuery(
	({ page, pageSize }: { page: number, pageSize: number }) => {
		const queryKey = [...tags.object.list('ObjectType'), 'getOutlinerObjectTypeIcons', { page, pageSize }]
		return {
			queryFn: async () => {
				const r: Array<null | [int, Uint8Array]> = await binaryInvoke('get_outliner_object_type_icons', [page * pageSize, pageSize])
				const data = r.map((o) => {
					let obj = {} as { url?: string, imageId?: int }
					if (!o) { return obj }
					const [imageId, data] = o
					const blob = new Blob([data], { type: 'image/png' })
					obj = { url: createObjectUrl(blob), imageId }
					// FIXME: share cache entries with getGameImageUrl
					// queryClient.setQueryData(tags.image.url(imageId), url)
					// FIXME let it know not to revoke the object URLs prematurely when it evicts the cache
					return obj
				})
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
			queryKey,
		}
	}
)

// getObjectTypeAnimation: builder.query<Animation | null, LookupArg<ObjectType>>({
// 	query: (args) => invoke('get_object_type_animation', args),
// 	transformResponse: (r: Animation) => enhanceAnimation(r),
// 	providesTags: (r, _e, arg) => [{ type: 'ObjectType', id: String(arg.id)}, r && { type: 'Animation', id: String(r.id) }]
// }),

export const getObjectTypeAnimation = createQuery({
	queryFn: async (arg: LookupForType<'ObjectType'>) => {
		const r: Animation = await invoke('get_object_type_animation', arg)
		return enhanceAnimation(r)
	},
	queryKey: (arg) => [...tags.object.id(arg), 'animation'],
})

// getRootAnimations: builder.query<Lookup<Animation>[], void>({
// 	query: () => invoke('get_root_animations'),
// 	transformResponse: (r: number[]) => r.map(id => ({ id, _type: 'Animation' })),
// 	providesTags: ['Animation']
// }),
export const getRootAnimations = createQuery({
	queryFn: async () => {
		const r: number[] = await invoke('get_root_animations')
		return r.map(id => ({ id, _type: 'Animation' } as LookupForType<'Animation'>))
	},
	queryKey: [...tags.object.list('Animation'), 'root'],
})

// getAnimationChildren: builder.query<Lookup<Animation>[], number>({
// 	query: (id) => invoke('get_animation_children', { id }),
// 	transformResponse: (r: number[]) => r.map(id => ({ id, _type: 'Animation' })),
// 	providesTags: ['Animation']
// }),
export const getAnimationChildren = createQuery({
	queryFn: async (id: int) => {
		const r: number[] = await invoke('get_animation_children', { id })
		return r.map(id => ({ id, _type: 'Animation' } as LookupForType<'Animation'>))
	},
	queryKey: (id: int) => [...tags.object.id({ _type: 'Animation', id }), 'children'],
})

// createAnimation: builder.mutation<int, { objectTypeId: int }>({
// 	query: (args) => invoke('create_animation', args),
// 	invalidatesTags: (r, _e, arg) => [{ type: 'ObjectType', id: String(arg.objectTypeId) }, r && { type: 'Animation', id: String(r) }]
// }),
export const createAnimation = createMutation({
	mutationFn: (args: { objectTypeId: int }) => invoke('create_animation', args),
	onSuccess: (r, arg) => invalidate([{ type: 'ObjectType', id: String(arg.objectTypeId) }, r && { type: 'Animation', id: String(r) }])
})

// getBehaviors: builder.query<Lookup<Behavior>[], void>({
// 	query: () => invoke('get_behaviors'),
// 	transformResponse: (r: [number, number][]) => r.map(([objectTypeId, movIndex]) => ({ objectTypeId, movIndex, _type: 'Behavior' })),
// 	providesTags: ['Behavior']
// }),
export const getBehaviors = createQuery({
	queryFn: async () => {
		const r: [number, number][] = await invoke('get_behaviors')
		return r.map(([objectTypeId, movIndex]) => ({ objectTypeId, movIndex, _type: 'Behavior' } as LookupForType<'Behavior'>))
	},
	queryKey: tags.object.list('Behavior'),
})

// getContainers: builder.query<Lookup<Container>[], void>({
// 	query: () => invoke('get_containers'),
// 	transformResponse: (r: number[]) => r.map(id => ({ id, _type: 'Container' })),
// 	providesTags: ['Container']
// }),
export const getContainers = createQuery({
	queryFn: async () => {
		const r: number[] = await invoke('get_containers')
		return r.map(id => ({ id, _type: 'Container' } as LookupForType<'Container'>))
	},
	queryKey: tags.object.list('Container'),
})

// searchContainers: builder.query<{ _type: 'Container', name: string, id: int }[], SearchOptions>({
// 	query: (options) => invoke('search_containers', { options }),
// 	transformResponse: (r: [number, string][]) => r.map(([id, name]) => ({ id, name, _type: 'Container' })),
// 	providesTags: [{ type: 'Container', id: 'LIST' }]
// }),
export const searchContainers = createQuery({
	queryFn: async (options: SearchOptions) => {
		const r: [number, string][] = await invoke('search_containers', { options })
		return r.map(([id, name]) => ({ id, name, _type: 'Container' } as LookupForType<'Container'>))
	},
	queryKey: (options: SearchOptions) => tags.object.list('Container', options),
})

// getFamilies: builder.query<Lookup<Family>[], void>({
// 	query: () => invoke('get_families'),
// 	transformResponse: (r: string[]) => r.map(name => ({ name, _type: 'Family' })),
// 	providesTags: ['Family']
// }),
export const getFamilies = createQuery({
	queryFn: async () => {
		const r: string[] = await invoke('get_families')
		return r.map(name => ({ name, _type: 'Family' } as LookupForType<'Family'>))
	},
	queryKey: tags.object.list('Family'),
})

// familyAddObject: builder.mutation<void, { name: string, objectTypeId: int }>({
// 	query: (args) => invoke('family_add_object', args)
// }),
export const familyAddObject = createMutation({
	mutationFn: (args: { name: string, objectTypeId: int }) => invoke('family_add_object', args),
	onSuccess: (_r, args) => invalidate(tags.object.id({ _type: 'Family', name: args.name }))
})

// familyRemoveObject: builder.mutation<void, { name: string, objectTypeId: int }>({
// 	query: (args) => invoke('family_remove_object', args)
// }),
export const familyRemoveObject = createMutation({
	mutationFn: (args: { name: string, objectTypeId: int }) => invoke('family_remove_object', args),
	onSuccess: (_r, args) => invalidate(tags.object.id({ _type: 'Family', name: args.name }))
})

// familyAddVariable: builder.mutation<void, { name: string, varName: string, value: number | string }>({
// 	query: (args) => invoke('family_add_variable', args)
// }),
export const familyAddVariable = createMutation({
	mutationFn: (args: { name: string, varName: string, value: number | string }) => invoke('family_add_variable', args),
	onSuccess: (_r, args) => invalidate(tags.object.id({ _type: 'Family', name: args.name }))
})

// familyDeleteVariable: builder.mutation<void, { name: string, varName: string }>({
// 	query: (args) => invoke('family_delete_variable', args),
// }),
export const familyDeleteVariable = createMutation({
	mutationFn: (args: { name: string, varName: string }) => invoke('family_delete_variable', args),
	onSuccess: (_r, args) => invalidate(tags.object.id({ _type: 'Family', name: args.name }))
})

// createFamily: builder.mutation<void, string>({
// 	query: (name) => invoke('create_family', { name }),
// 	invalidatesTags: (_r, _e, arg) => [{ type: 'Family', id: arg }]
// }),
export const createFamily = createMutation({
	mutationFn: (name: string) => invoke('create_family', { name }),
	onSuccess: (_r, arg) => invalidate(tags.object.id({ _type: 'Family', name: arg }))
})

// getObjectTraits: builder.query<Lookup<ObjectTrait>[], void>({
// 	query: () => invoke('get_traits'),
// 	transformResponse: (r: string[]) => r.map(name => ({ name, _type: 'ObjectTrait' })),
// 	providesTags: ['ObjectTrait']
// }),
export const getObjectTraits = createQuery({
	queryFn: async () => {
		const r: string[] = await invoke('get_traits')
		return r.map(name => ({ name, _type: 'ObjectTrait' } as LookupForType<'ObjectTrait'>))
	},
	queryKey: tags.object.list('ObjectTrait'),
})

// createObjectTrait: builder.mutation<void, string>({
// 	query: (name) => invoke('create_trait', { name }),
// 	invalidatesTags: (_r, _e, arg) => [{ type: 'ObjectTrait', id: arg }]
// }),
export const createObjectTrait = createMutation({
	mutationFn: (name: string) => invoke('create_trait', { name }),
	onSuccess: (_r, arg) => invalidate(tags.object.id({ _type: 'ObjectTrait', name: arg }))
})

export async function _getTowermodObject(lookup: UniqueObjectLookup): Promise<UniqueTowermodObject | null> {
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
		case 'ImageMetadata': return enhanceImageMetadata(await invoke('get_image_metadata', lookup))
		default: assertUnreachable(type)
	}
}

export async function _updateTowermodObject(obj: UniqueTowermodObject): Promise<void> {
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

export async function _deleteTowermodObject(lookup: UniqueObjectLookup): Promise<void> {
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
