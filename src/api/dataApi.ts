import { binaryInvoke, createObjectUrl, enhanceAnimation, enhanceAppBlock, enhanceBehavior, enhanceContainer, enhanceFamily, enhanceImageMetadata, enhanceLayout, enhanceLayoutLayer, enhanceObjectInstance, enhanceObjectTrait, enhanceObjectType, int, revokeObjectUrl, useObjectUrl } from '@/util';
import { baseApi } from './api';
import { invoke } from '@tauri-apps/api/core';
import { Animation, Behavior, ImageMetadata, Layout, LayoutLayer, ObjectInstance, ObjectType, PluginData, Container, Family, ObjectTrait, AppBlock, SearchOptions } from '@towermod';
import type { LookupForType, UniqueTowermodObject } from '@/util';

type Lookup<T extends UniqueTowermodObject> = LookupForType<T['_type']>
type LookupArg<T extends UniqueTowermodObject> = Omit<Lookup<T>, '_type'>

export const dataApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getGameImageUrl: builder.query<{ url: string | null }, number>({
			query: async (id) => {
				const arrayBuffer = await _getGameImage(id)
				let blob: Blob | null = null
				if (arrayBuffer) {
					blob = new Blob([arrayBuffer], { type: 'image/png' })
				}
				return { url: blob && createObjectUrl(blob) }
			},
			providesTags: (_r, _e, arg) => [{ type: 'Image', id: String(arg) }],
			onCacheEntryAdded: async (_arg, cacheApi) => {
				const info = await cacheApi.cacheDataLoaded
				if (!info.data?.url) { return }
				// revoke the object URL (unless cache data was upserted from another query)
				if (!('_shared' in info.data)) {
					await cacheApi.cacheEntryRemoved
					revokeObjectUrl(info.data.url)
				}
			},
		}),
		getImageMetadata: builder.query<ImageMetadata | null, { id: number }>({
			query: (arg) => invoke('get_image_metadata', arg),
			transformResponse: (r: ImageMetadata) => enhanceImageMetadata(r),
			providesTags: (r) => r ? [{ type: 'ImageMetadata', id: r.id }] : []
		}),
		setImageMetadata: builder.mutation<void, ImageMetadata>({
			query: (data) => invoke('set_image_metadata', { data }),
			invalidatesTags: (_r, _e, arg) => [{ type: 'ImageMetadata', id: arg.id }]
		}),
		isImageOverridden: builder.query<boolean, number>({
			query: (id) => invoke('is_image_overridden', { id }),
			providesTags: (_r, _e, arg) => [{ type: 'Image', id: String(arg) }]
		}),
		getEditorPlugin: builder.query<PluginData, number>({
			query: (id) => invoke('get_editor_plugin', { id }),
			providesTags: ['Data']
		}),
		getEditorPlugins: builder.query<Record<number, PluginData>, void>({
			query: () => invoke('get_editor_plugins'),
			providesTags: ['Data']
		}),

		getObjectType: builder.query<ObjectType | null, LookupArg<ObjectType>>({
			query: (args) => invoke('get_object_type', args),
			transformResponse: (r: ObjectType) => enhanceObjectType(r),
			providesTags: (_r, _e, arg) => [{ type: 'ObjectType', id: String(arg.id) }]
		}),
		getObjectTypes: builder.query<Lookup<ObjectType>[], void>({
			query: () => invoke('get_object_types'),
			transformResponse: (r: number[]) => r.map(id => ({ id, _type: 'ObjectType' })),
			providesTags: [{ type: 'ObjectType', id: 'LIST' }]
		}),
		searchObjectTypes: builder.query<{ _type: 'ObjectType', name: string, id: int }[], SearchOptions>({
			query: (options) => invoke('search_object_types', { options }),
			transformResponse: (r: [number, string][]) => r.map(([id, name]) => ({ id, name, _type: 'ObjectType' })),
			providesTags: [{ type: 'ObjectType', id: 'LIST' }]
		}),
		updateObjectType: builder.mutation<void, ObjectType>({
			query: (obj) => invoke('update_object_type', { obj }),
			invalidatesTags: (_r, _e, arg) => [{ type: 'ObjectType', id: String(arg.id) }]
		}),
		getObjectTypeImageId: builder.query<int | null, int>({
			query: (id) => invoke('get_object_type_image_id', { id }),
			providesTags: (_r, _e, arg) => [{ type: 'Image', id: String(arg) }]
		}),
		createObjectType: builder.mutation<int, { pluginId: int }>({
			query: (pluginId) => invoke('create_object_type', { pluginId }),
			invalidatesTags: (_r, _e, id) => [{ type: 'ObjectType', id: String(id) }, { type: 'ObjectType', id: 'LIST' }]
		}),
		deleteObjectType: builder.mutation<void, int>({
			query: (id) => invoke('delete_object_type', { id }),
			invalidatesTags: (_r, _e, id) => [{ type: 'ObjectType', id: String(id) }, { type: 'ObjectType', id: 'LIST' }]
		}),

		getObjectInstance: builder.query<ObjectInstance | null, LookupArg<ObjectInstance>>({
			query: (args) => invoke('get_object_instance', args),
			transformResponse: (r: ObjectInstance) => enhanceObjectInstance(r),
			providesTags: (_r, _e, arg) => [{ type: 'ObjectInstance', id: String(arg.id) }]
		}),
		getObjectInstances: builder.query<Lookup<ObjectInstance>[], number>({
			query: (layoutLayerId) => invoke('get_object_instances', { layoutLayerId }),
			transformResponse: (r: number[]) => r.map(id => ({ id, _type: 'ObjectInstance' })),
			providesTags: ['ObjectInstance']
		}),
		searchObjectInstances: builder.query<{ _type: 'ObjectInstance', name: string, id: int }[], SearchOptions>({
			query: (options) => invoke('search_object_instances', { options }),
			transformResponse: (r: [number, string][]) => r.map(([id, name]) => ({ id, name, _type: 'ObjectInstance' })),
			providesTags: [{ type: 'ObjectType', id: 'LIST' }]
		}),
		getObjectTypeInstances: builder.query<Lookup<ObjectInstance>[], number>({
			query: (objectTypeId) => invoke('get_object_type_instances', { objectTypeId }),
			transformResponse: (r: number[]) => r.map(id => ({ id, _type: 'ObjectInstance' })),
			providesTags: ['ObjectInstance']
		}),
		updateObjectInstance: builder.mutation<void, ObjectInstance>({
			query: (obj) => invoke('update_object_instance', { obj }),
			invalidatesTags: (_r, _e, arg) => [{ type: 'ObjectInstance', id: String(arg.id) }]
		}),
		getObjectInstanceImageId: builder.query<int | null, int>({
			query: (id) => invoke('get_object_instance_image_id', { id }),
			providesTags: (_r, _e, arg) => [{ type: 'Image', id: String(arg) }]
		}),

		getLayout: builder.query<Layout | null, LookupArg<Layout>>({
			query: (args) => invoke('get_layout', args),
			transformResponse: (r: Layout) => enhanceLayout(r),
			providesTags: (_r, _e, arg) => [{ type: 'Layout', id: arg.name }]
		}),
		getLayouts: builder.query<Lookup<Layout>[], void>({
			query: () => invoke('get_layouts'),
			transformResponse: (r: string[]) => r.map(name => ({ name, _type: 'Layout' })),
			providesTags: ['Layout']
		}),
		updateLayout: builder.mutation<void, Layout>({
			query: (layout) => invoke('update_layout', { layout }),
			invalidatesTags: (_r, _e, arg) => [{ type: 'Layout', id: arg.name }]
		}),

		getLayoutLayer: builder.query<LayoutLayer | null, LookupArg<LayoutLayer>>({
			query: (args) => invoke('get_layout_layer', args),
			transformResponse: (r: LayoutLayer) => enhanceLayoutLayer(r),
			providesTags: (_r, _e, arg) => [{ type: 'LayoutLayer', id: String(arg.id) }]
		}),
		getLayoutLayers: builder.query<Lookup<LayoutLayer>[], string>({
			query: (layoutName) => invoke('get_layout_layers', { layoutName }),
			transformResponse: (r: number[]) => r.map(id => ({ id, _type: 'LayoutLayer' })),
			providesTags: ['LayoutLayer']
		}),
		searchLayoutLayers: builder.query<{ _type: 'LayoutLayer', name: string, id: int }[], SearchOptions>({
			query: (options) => invoke('search_layout_layers', { options }),
			transformResponse: (r: [number, string][]) => r.map(([id, name]) => ({ id, name, _type: 'LayoutLayer' })),
			providesTags: [{ type: 'LayoutLayer', id: 'LIST' }]
		}),
		updateLayoutLayer: builder.mutation<void, LayoutLayer>({
			query: (layer) => invoke('update_layout_layer', { layer }),
			invalidatesTags: (_r, _e, arg) => [{ type: 'LayoutLayer', id: String(arg.id) }]
		}),

		getAnimation: builder.query<Animation | null, LookupArg<Animation>>({
			query: (args) => invoke('get_animation', args),
			transformResponse: (r: Animation) => enhanceAnimation(r),
			providesTags: (_r, _e, arg) => [{ type: 'Animation', id: String(arg.id) }]
		}),
		getOutlinerObjectTypes: builder.query<Array<ObjectType & { animation?: Animation }>, { page: number, pageSize: number }>({
			query: ({ page, pageSize }) => invoke('get_outliner_object_types', { skip: page * pageSize, take: pageSize}),
			transformResponse: (r: [ObjectType, Animation | null][]) => r.map(([obj, anim]) => (
				{ ...enhanceObjectType(obj), animation: enhanceAnimation(anim) ?? undefined }
			)),
			providesTags: ['ObjectType']
		}),
		getOutlinerObjectTypeIcons: builder.query<Array<{ url: undefined, imageId: undefined } | { url: string, imageId: int }>, { page: number, pageSize: number }>({
			query: ({ page, pageSize }) => binaryInvoke('get_outliner_object_type_icons', [page * pageSize, pageSize]),
			transformResponse: (r: Array<null | [int, Uint8Array]>) => {
				return r.map((o) => {
					if (!o) { return {} }
					const [imageId, data] = o
					const blob = new Blob([data], { type: 'image/png' })
					return { url: createObjectUrl(blob), imageId }
				})
			},
			providesTags: ['ObjectType', 'Image'],
			onCacheEntryAdded: async (_arg, cacheApi) => {
				const info = await cacheApi.cacheDataLoaded
				if (!info.data) { return }
				const { api } = await import('.')
				for (const img of info.data) {
					// share cache entries with getGameImageUrl
					if (img.url) {
						// let it know not to revoke the object URLs prematurely when it evicts the cache
						const record = { url: img.url, _shared: true }
						api.util.upsertQueryData('getGameImageUrl', img.imageId, record)
					}
				}
				await cacheApi.cacheEntryRemoved

				for (const { url } of info.data) {
					if (url) {
						revokeObjectUrl(url)
					}
				}
			},
		}),
		getObjectTypeAnimation: builder.query<Animation | null, LookupArg<ObjectType>>({
			query: (args) => invoke('get_object_type_animation', args),
			transformResponse: (r: Animation) => enhanceAnimation(r),
			providesTags: (r, _e, arg) => [{ type: 'ObjectType', id: String(arg.id)}, r && { type: 'Animation', id: String(r.id) }]
		}),
		getRootAnimations: builder.query<Lookup<Animation>[], void>({
			query: () => invoke('get_root_animations'),
			transformResponse: (r: number[]) => r.map(id => ({ id, _type: 'Animation' })),
			providesTags: ['Animation']
		}),
		getAnimationChildren: builder.query<Lookup<Animation>[], number>({
			query: (id) => invoke('get_animation_children', { id }),
			transformResponse: (r: number[]) => r.map(id => ({ id, _type: 'Animation' })),
			providesTags: ['Animation']
		}),
		updateAnimation: builder.mutation<void, Animation>({
			query: (animation) => invoke('update_animation', { animation }),
			invalidatesTags: (_r, _e, arg) => [{ type: 'Animation', id: String(arg.id) }]
		}),

		getBehavior: builder.query<Behavior | null, LookupArg<Behavior>>({
			query: (args) => invoke('get_behavior', args),
			transformResponse: (r: Behavior) => enhanceBehavior(r),
			providesTags: (_r, _e, arg) => [{ type: 'Behavior', id: `${arg.objectTypeId}.${arg.movIndex}` }]
		}),
		getBehaviors: builder.query<Lookup<Behavior>[], void>({
			query: () => invoke('get_behaviors'),
			transformResponse: (r: [number, number][]) => r.map(([objectTypeId, movIndex]) => ({ objectTypeId, movIndex, _type: 'Behavior' })),
			providesTags: ['Behavior']
		}),
		updateBehavior: builder.mutation<void, Behavior>({
			query: (behavior) => invoke('update_behavior', { behavior }),
			invalidatesTags: (_r, _e, arg) => [{ type: 'Behavior', id: `${arg.objectTypeId}.${arg.movIndex}` }]
		}),

		getContainer: builder.query<Container | null, LookupArg<Container>>({
			query: (args) => invoke('get_container', args),
			transformResponse: (r: Container) => enhanceContainer(r),
			providesTags: (_r, _e, arg) => [{ type: 'Container', id: String(arg.id) }]
		}),
		getContainers: builder.query<Lookup<Container>[], void>({
			query: () => invoke('get_containers'),
			transformResponse: (r: number[]) => r.map(id => ({ id, _type: 'Container' })),
			providesTags: ['Container']
		}),
		searchContainers: builder.query<{ _type: 'Container', name: string, id: int }[], SearchOptions>({
			query: (options) => invoke('search_containers', { options }),
			transformResponse: (r: [number, string][]) => r.map(([id, name]) => ({ id, name, _type: 'Container' })),
			providesTags: [{ type: 'Container', id: 'LIST' }]
		}),
		updateContainer: builder.mutation<void, Container>({
			query: (container) => invoke('update_container', { container }),
			invalidatesTags: (_r, _e, arg) => [{ type: 'Container', id: String(arg.id) }]
		}),

		getFamily: builder.query<Family | null, LookupArg<Family>>({
			query: (args) => invoke('get_family', args),
			transformResponse: (r: Family) => enhanceFamily(r),
			providesTags: (_r, _e, arg) => [{ type: 'Family', id: String(arg.name) }]
		}),
		getFamilies: builder.query<Lookup<Family>[], void>({
			query: () => invoke('get_families'),
			transformResponse: (r: string[]) => r.map(name => ({ name, _type: 'Family' })),
			providesTags: ['Family']
		}),
		familyAddObject: builder.mutation<void, { name: string, objectTypeId: int }>({
			query: (args) => invoke('family_add_object', args)
		}),
		familyRemoveObject: builder.mutation<void, { name: string, objectTypeId: int }>({
			query: (args) => invoke('family_remove_object', args)
		}),
		familyAddVariable: builder.mutation<void, { name: string, varName: string, value: number | string }>({
			query: (args) => invoke('family_add_variable', args)
		}),
		familyDeleteVariable: builder.mutation<void, { name: string, varName: string }>({
			query: (args) => invoke('family_delete_variable', args),
		}),

		getObjectTrait: builder.query<ObjectTrait | null, LookupArg<ObjectTrait>>({
			query: (args) => invoke('get_trait', args),
			transformResponse: (r: ObjectTrait) => enhanceObjectTrait(r),
			providesTags: (_r, _e, arg) => [{ type: 'ObjectTrait', id: String(arg.name) }]
		}),
		getObjectTraits: builder.query<Lookup<ObjectTrait>[], void>({
			query: () => invoke('get_traits'),
			transformResponse: (r: string[]) => r.map(name => ({ name, _type: 'ObjectTrait' })),
			providesTags: ['ObjectTrait']
		}),
		updateObjectTrait: builder.mutation<void, ObjectTrait>({
			query: (objectTrait) => invoke('update_trait', { objectTrait }),
			invalidatesTags: (_r, _e, arg) => [{ type: 'ObjectTrait', id: String(arg.name) }]
		}),

		getAppBlock: builder.query<AppBlock, void>({
			query: () => invoke<AppBlock>('get_app_block'),
			transformResponse: (r: AppBlock) => enhanceAppBlock(r),
			providesTags: ['AppBlock']
		}),
		updateAppBlock: builder.mutation<void, AppBlock>({
			query: (appBlock) => invoke('update_app_block', { appBlock }),
			invalidatesTags: ['AppBlock']
		}),
	}),
})

async function _getGameImage(id: int): Promise<Uint8Array | null> {
	const enc = new TextEncoder();
	const bytes = enc.encode(JSON.stringify(id))
	const resp = new Uint8Array(await invoke("get_image", bytes));
	if (!resp.length) {
		return null
	}
	return resp
}
