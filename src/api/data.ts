import { int, useObjectUrl } from '@/util';
import { api } from './api';
import { invoke } from '@tauri-apps/api/core';
import { queryFn } from './apiUtil';

export const dataApi = api.injectEndpoints({
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
			providesTags: (_r, _e, arg) => ['Data', { type: 'Image', id: arg }],
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

