import { enhanceAnimation, enhanceAppBlock, enhanceBehavior, enhanceContainer, enhanceFamily, enhanceImageMetadata, enhanceLayout, enhanceLayoutLayer, enhanceObjectInstance, enhanceObjectTrait, enhanceObjectType, int, useObjectUrl } from '@/util';
import { baseApi } from './api';
import { invoke } from '@tauri-apps/api/core';
import { queryFn } from './baseApiUtil';
import { Animation, Behavior, ImageMetadata, Layout, LayoutLayer, ObjectInstance, ObjectType, PluginData, Container, Family, ObjectTrait, AppBlock } from '@towermod';
import type { LookupForType, UniqueTowermodObject } from '@/util';

type Lookup<T extends UniqueTowermodObject> = LookupForType<T['_type']>
type LookupArg<T extends UniqueTowermodObject> = Omit<Lookup<T>, '_type'>

export const dataApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getGameImage: builder.query<Blob | null, number>({
			queryFn: queryFn(async (id) => {
				const arrayBuffer = await _getGameImage(id)
				let blob: Blob | null = null
				if (arrayBuffer) {
					blob = new Blob([arrayBuffer], { type: 'image/png' })
				}
				return blob
			}),
			providesTags: (_r, _e, arg) => [{ type: 'Image', id: String(arg) }],
		}),
		getImageMetadata: builder.query<ImageMetadata | null, number>({
			queryFn: queryFn(async (id) => {
				const metadata: ImageMetadata = await invoke('get_image_metadata', { id })
				enhanceImageMetadata(metadata)
				return metadata
			}),
			providesTags: (r) => r ? [{ type: 'ImageMetadata', id: r.id }] : []
		}),
		setImageMetadata: builder.mutation<void, ImageMetadata>({
			queryFn: queryFn(async (data) => {
				return await invoke('set_image_metadata', { data })
			}),
			invalidatesTags: (_r, _e, arg) => [{ type: 'ImageMetadata', id: arg.id }]
		}),
		isImageOverridden: builder.query<boolean, number>({
			queryFn: queryFn(async (id) => {
				return await invoke('is_image_overridden', { id })
			}),
			providesTags: (_r, _e, arg) => [{ type: 'Image', id: String(arg) }]
		}),
		getEditorPlugin: builder.query<PluginData, number>({
			queryFn: queryFn(async (id) => {
				return await invoke('get_editor_plugin', { id })
			}),
			providesTags: ['Data']
		}),
		getEditorPlugins: builder.query<Record<number, PluginData>, void>({
			queryFn: queryFn(async () => {
				return await invoke('get_editor_plugins')
			}),
			providesTags: ['Data']
		}),

		getObjectType: builder.query<ObjectType | null, LookupArg<ObjectType>>({
			queryFn: queryFn(async ({ id }) => {
				return enhanceObjectType(await invoke('get_object_type', { id }))
			}),
			providesTags: (_r, _e, arg) => [{ type: 'ObjectType', id: String(arg) }]
		}),
		getObjectTypes: builder.query<Lookup<ObjectType>[], void>({
			queryFn: queryFn(async () => {
				const ids: number[] = await invoke('get_object_types')
				return ids.map(id => ({ id, _type: 'ObjectType' }))
			}),
			providesTags: ['ObjectType']
		}),
		searchObjectTypes: builder.query<Lookup<ObjectType>[], string>({
			queryFn: queryFn(async (txt) => {
				const ids: number[] = await invoke('search_object_types', { txt })
				return ids.map(id => ({ id, _type: 'ObjectType' }))
			}),
			providesTags: ['ObjectType'],
		}),

		getObjectInstance: builder.query<ObjectInstance | null, LookupArg<ObjectInstance>>({
			queryFn: queryFn(async ({ id }) => {
				return enhanceObjectInstance(await invoke('get_object_instance', { id }))
			}),
			providesTags: (_r, _e, arg) => [{ type: 'ObjectInstance', id: String(arg.id) }]
		}),

		getLayout: builder.query<Layout | null, LookupArg<Layout>>({
			queryFn: queryFn(async ({ name }) => {
				return enhanceLayout(await invoke('get_layout', { name }))
			}),
			providesTags: (_r, _e, arg) => [{ type: 'Layout', id: arg.name }]
		}),
		getLayouts: builder.query<Lookup<Layout>[], void>({
			queryFn: queryFn(async () => {
				const names: string[] = await invoke('get_layouts')
				return names.map(name => ({ name, _type: 'Layout' }))
			}),
			providesTags: ['Layout']
		}),

		getLayoutLayer: builder.query<LayoutLayer | null, LookupArg<LayoutLayer>>({
			queryFn: queryFn(async ({ id }) => {
				return enhanceLayoutLayer(await invoke('get_layout_layer', { id }))
			}),
			providesTags: (_r, _e, arg) => [{ type: 'LayoutLayer', id: String(arg.id) }]
		}),
		getLayoutLayers: builder.query<Lookup<LayoutLayer>[], void>({
			queryFn: queryFn(async () => {
				const ids: number[] = await invoke('get_layout_layers')
				return ids.map(id => ({ id, _type: 'LayoutLayer' }))
			}),
			providesTags: ['LayoutLayer']
		}),

		getAnimation: builder.query<Animation | null, LookupArg<Animation>>({
			queryFn: queryFn(async ({ id }) => {
				return enhanceAnimation(await invoke('get_animation', { id }))
			}),
			providesTags: (_r, _e, arg) => [{ type: 'Animation', id: String(arg.id) }]
		}),
		getAnimations: builder.query<Lookup<Animation>[], void>({
			queryFn: queryFn(async () => {
				const ids: number[] = await invoke('get_animations')
				return ids.map(id => ({ id, _type: 'Animation' }))
			}),
			providesTags: ['Animation']
		}),

		getBehavior: builder.query<Behavior | null, LookupArg<Behavior>>({
			queryFn: queryFn(async ({ objectTypeId, movIndex }) => {
				return enhanceBehavior(await invoke('get_behavior', { 'object_type_id': objectTypeId, 'mov_index': movIndex }))
			}),
			providesTags: (_r, _e, arg) => [{ type: 'Behavior', id: `${arg.objectTypeId}.${arg.movIndex}` }]
		}),
		getBehaviors: builder.query<Lookup<Behavior>[], void>({
			queryFn: queryFn(async () => {
				const ids: [number, number][] = await invoke('get_behaviors')
				return ids.map(([objectTypeId, movIndex]) => {
					return { objectTypeId, movIndex, _type: 'Behavior' }
				})
			}),
			providesTags: ['Behavior']
		}),

		getContainer: builder.query<Container | null, LookupArg<Container>>({
			queryFn: queryFn(async ({ objectIds }) => {
				return enhanceContainer(await invoke('get_container', { id: objectIds[0] }))
			}),
			providesTags: (_r, _e, arg) => [{ type: 'Container', id: String(arg.objectIds[0]) }]
		}),
		getContainers: builder.query<Lookup<Container>[], void>({
			queryFn: queryFn(async () => {
				const ids: number[] = await invoke('get_containers')
				return ids.map(id => ({ objectIds: [id], _type: 'Container' }))
			}),
			providesTags: ['Container']
		}),

		getFamily: builder.query<Family | null, LookupArg<Family>>({
			queryFn: queryFn(async ({ name }) => {
				return enhanceFamily(await invoke('get_family', { name }))
			}),
			providesTags: (_r, _e, arg) => [{ type: 'Family', id: String(arg.name) }]
		}),
		getFamilies: builder.query<Lookup<Family>[], void>({
			queryFn: queryFn(async () => {
				const names: string[] = await invoke('get_families')
				return names.map(name => ({ name, _type: 'Family' }))
			}),
			providesTags: ['Family']
		}),

		getObjectTrait: builder.query<ObjectTrait | null, LookupArg<ObjectTrait>>({
			queryFn: queryFn(async ({ name }) => {
				return enhanceObjectTrait(await invoke('get_trait', { name }))
			}),
			providesTags: (_r, _e, arg) => [{ type: 'ObjectTrait', id: String(arg.name) }]
		}),
		getObjectTraits: builder.query<Lookup<ObjectTrait>[], void>({
			queryFn: queryFn(async () => {
				const names: string[] = await invoke('get_traits')
				return names.map(name => ({ name, _type: 'ObjectTrait' }))
			}),
			providesTags: ['ObjectTrait']
		}),

		getAppBlock: builder.query<AppBlock, void>({
			queryFn: queryFn(async () => {
				return enhanceAppBlock(await invoke('get_app_block'))
			}),
			providesTags: ['AppBlock']
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
