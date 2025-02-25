import { enhanceAnimation, enhanceAppBlock, enhanceBehavior, enhanceContainer, enhanceFamily, enhanceImageMetadata, enhanceLayout, enhanceObjectTrait, enhanceObjectType, int, useObjectUrl } from '@/util';
import { baseApi } from './api';
import { invoke } from '@tauri-apps/api/core';
import { queryFn } from './baseApiUtil';
import { CstcData, ImageMetadata, PluginData } from '@towermod';

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
		getImageMetadata: builder.query<ImageMetadata, number>({
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




		getData: builder.query<CstcData, void>({
			queryFn: queryFn(async () => {
				const data: CstcData = await invoke('get_data');
				for (const animation of data.animations) { enhanceAnimation(animation) }
				for (const objectType of Object.values(data.objectTypes)) { enhanceObjectType(objectType) }
				for (const behavior of data.behaviors) { enhanceBehavior(behavior) }
				for (const trait of data.traits) { enhanceObjectTrait(trait) }
				for (const family of data.families) { enhanceFamily(family) }
				for (const layout of data.layouts) { enhanceLayout(layout) }
				for (const container of data.containers) { enhanceContainer(container) }
				enhanceAppBlock(data.appBlock)
				return data;
			}),
			providesTags: ['Data'],
			keepUnusedDataFor: Infinity,
		}),
		updateData: builder.mutation<void, CstcData>({
			queryFn: queryFn(async (newData) => {
				await invoke('update_data', { newData })
			}),
			invalidatesTags: ['Data']
		})

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

