import { enhanceAnimation, enhanceAppBlock, enhanceBehavior, enhanceContainer, enhanceFamily, enhanceImageMetadata, enhanceLayout, enhanceLayoutLayer, enhanceObjectInstance, enhanceObjectTrait, enhanceObjectType, int, useObjectUrl } from '@/util';
import { baseApi } from './api';
import { invoke } from '@tauri-apps/api/core';
import { Animation, Behavior, ImageMetadata, Layout, LayoutLayer, ObjectInstance, ObjectType, PluginData, Container, Family, ObjectTrait, AppBlock } from '@towermod';
import type { LookupForType, UniqueTowermodObject } from '@/util';

type Lookup<T extends UniqueTowermodObject> = LookupForType<T['_type']>
type LookupArg<T extends UniqueTowermodObject> = Omit<Lookup<T>, '_type'>

export const dataApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getGameImage: builder.query<Blob | null, number>({
			query: async (id) => {
				const arrayBuffer = await _getGameImage(id)
				let blob: Blob | null = null
				if (arrayBuffer) {
					blob = new Blob([arrayBuffer], { type: 'image/png' })
				}
				return blob
			},
			providesTags: (_r, _e, arg) => [{ type: 'Image', id: String(arg) }],
		}),
		getImageMetadata: builder.query<ImageMetadata | null, number>({
			query: (id) => invoke('get_image_metadata', { id }),
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
		searchObjectTypes: builder.query<{ _type: 'ObjectType', name: string, id: int }[], string>({
			query: (txt) => invoke('search_object_types', { txt }),
			transformResponse: (r: [number, string][]) => r.map(([id, name]) => ({ id, name, _type: 'ObjectType' })),
			providesTags: [{ type: 'ObjectType', id: 'LIST' }]
		}),
		updateObjectType: builder.mutation<void, ObjectType>({
			query: (obj) => invoke('update_object_type', { obj }),
			invalidatesTags: (_r, _e, arg) => [{ type: 'ObjectType', id: String(arg.id) }]
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
		getObjectTypeInstances: builder.query<Lookup<ObjectInstance>[], number>({
			query: (objectTypeId) => invoke('get_object_type_instances', { objectTypeId }),
			transformResponse: (r: number[]) => r.map(id => ({ id, _type: 'ObjectInstance' })),
			providesTags: ['ObjectInstance']
		}),
		updateObjectInstance: builder.mutation<void, ObjectInstance>({
			query: (obj) => invoke('update_object_instance', { obj }),
			invalidatesTags: (_r, _e, arg) => [{ type: 'ObjectInstance', id: String(arg.id) }]
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
		updateLayoutLayer: builder.mutation<void, LayoutLayer>({
			query: (layer) => invoke('update_layout_layer', { layer }),
			invalidatesTags: (_r, _e, arg) => [{ type: 'LayoutLayer', id: String(arg.id) }]
		}),

		getAnimation: builder.query<Animation | null, LookupArg<Animation>>({
			query: (args) => invoke('get_animation', args),
			transformResponse: (r: Animation) => enhanceAnimation(r),
			providesTags: (_r, _e, arg) => [{ type: 'Animation', id: String(arg.id) }]
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
			query: ({ objectIds }) => invoke('get_container', { id: objectIds[0] }),
			transformResponse: (r: Container) => enhanceContainer(r),
			providesTags: (_r, _e, arg) => [{ type: 'Container', id: String(arg.objectIds[0]) }]
		}),
		getContainers: builder.query<Lookup<Container>[], void>({
			query: () => invoke('get_containers'),
			transformResponse: (r: number[]) => r.map(id => ({ objectIds: [id], _type: 'Container' })),
			providesTags: ['Container']
		}),
		updateContainer: builder.mutation<void, Container>({
			query: (container) => invoke('update_container', { container }),
			invalidatesTags: (_r, _e, arg) => [{ type: 'Container', id: String(arg.objectIds[0]) }]
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

export function useGameImageUrl(id: int): string | undefined {
	const { data: blob } = dataApi.useGetGameImageQuery(id)
	const href = useObjectUrl(blob);
	return href ?? undefined
}
