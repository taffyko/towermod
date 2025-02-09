import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { int } from '@/util/util';
import { invoke } from "@tauri-apps/api/core";
import { Game, ModInfo, Project, TowermodConfig } from '@towermod';
import type { BaseEndpointDefinition } from '@reduxjs/toolkit/query'
import { useObjectUrl } from './util/hooks';


type FetchBaseQueryFn = ReturnType<typeof fetchBaseQuery>
type CustomBaseQueryFn = FetchBaseQueryFn
// type CustomBaseQueryFn = BaseQueryFn<string, unknown, unknown, {}, {}>;
type QueryFn<ResultType, QueryArg> = Exclude<BaseEndpointDefinition<QueryArg, CustomBaseQueryFn, ResultType>['queryFn'], undefined>

function queryFn<ResultType, QueryArg>(fn: (arg: QueryArg) => Promise<ResultType>): QueryFn<ResultType, QueryArg> {
	return async (arg) => {
		try {
			let data: ResultType = await fn(arg)
			return {
				data,
			}
		} catch (e) {
			return {
				error: e as any,
			}
		}
	}
}

const tagTypes = ['Project', 'Game', 'Data', 'Image', 'ModInfo', 'TowermodConfig'] as const;

export const api = createApi({
	reducerPath: 'api',
	baseQuery: fetchBaseQuery({ baseUrl: '/' }), // Base URL for API calls
	tagTypes,
	endpoints: (builder) => ({
		getImage: builder.query<Blob | null, number>({
			queryFn: queryFn(async (id) => {
				const arrayBuffer = await getImage(id)
				let blob: Blob | null = null
				if (arrayBuffer) {
					blob = new Blob([arrayBuffer], { type: 'image/png' })
				}
				return blob
			}),
			providesTags: (_r, _e, arg) => ['Data', { type: 'Image', id: arg }],
		}),
		getGame: builder.query<Game | null, void>({
			queryFn: queryFn(async () => {
				const game: Game = await invoke('get_game')
				return game
			}),
			providesTags: ['Game'],
		}),
		getProject: builder.query<Project | null, void>({
			queryFn: queryFn(async () => {
				const project: Project = await invoke('get_project')
				return project
			}),
			providesTags: ['Project'],
		}),
		getInstalledMods: builder.query<ModInfo[], void>({
			queryFn: queryFn(async () => {
				const mods: ModInfo[] = await invoke('get_installed_mods')
				return mods
			}),
			providesTags: ['ModInfo'],
		}),
		installMod: builder.mutation<void, string>({
			queryFn: queryFn(async (path) => {
				await invoke('install_mod', { path })
			}),
			invalidatesTags: ['ModInfo'],
		}),
		isDataLoaded: builder.query<boolean, void>({
			queryFn: queryFn(async () => {
				return await invoke('is_data_loaded')
			}),
			providesTags: ['Data'],
		}),
		setGame: builder.mutation<void, string | null>({
			queryFn: queryFn(async (filePath) => {
				await invoke('set_game', { filePath: filePath || null })
			}),
			invalidatesTags: ['Project', 'Game', 'Data'],
		}),
		newProject: builder.mutation<void, void>({
			queryFn: queryFn(async () => {
				await invoke('new_project')
			}),
			invalidatesTags: ['Project', 'Data'],
		}),
		exportFromFiles: builder.mutation<void, void>({
			queryFn: queryFn(async () => {
				await invoke('export_from_files')
			}),
		}),
		exportFromLegacy: builder.mutation<void, void>({
			queryFn: queryFn(async () => {
				await invoke('export_from_legacy')
			}),
		}),
		playMod: builder.mutation<void, string>({
			queryFn: queryFn(async (zipPath) => {
				await invoke('play_mod', { zipPath })
			}),
		}),
		playProject: builder.mutation<void, void>({
			queryFn: queryFn(async () => {
				await invoke('play_project')
			}),
		}),
		playVanilla: builder.mutation<void, void>({
			queryFn: queryFn(async () => {
				await invoke('play_vanilla')
			}),
		}),
		getText: builder.query<string, string>({
			query: (arg) => ({ url: arg, responseHandler: 'text' })
		}),

		init: builder.mutation<void, void>({
			queryFn: queryFn(async () => {
				await invoke('init')
			}),
			invalidatesTags: tagTypes
		}),

		// config
		getConfig: builder.query<TowermodConfig, void>({
			queryFn: queryFn(async () => {
				return await invoke('get_config')
			}),
			providesTags: ['TowermodConfig']
		}),
		saveConfig: builder.mutation<void, void>({
			queryFn: queryFn(async () => {
				await invoke('save_config')
			}),
		}),
		loadConfig: builder.mutation<void, void>({
			queryFn: queryFn(async () => {
				await invoke('load_config')
			}),
			invalidatesTags: ['TowermodConfig'],
		}),
		cachePath: builder.query<string, void>({
			queryFn: queryFn(async () => {
				return await invoke('get_cache_dir_path')
			}),
		}),
		clearGameCache: builder.mutation<void, void>({
			queryFn: queryFn(async () => {
				await invoke('clear_game_cache')
			}),
		}),
		nukeCache: builder.mutation<void, void>({
			queryFn: queryFn(async () => {
				await invoke('nuke_cache')
			}),
		}),
	}),
});

async function getImage(id: int): Promise<Uint8Array | null> {
	const enc = new TextEncoder();
	const bytes = enc.encode(JSON.stringify(id))
	const resp = new Uint8Array(await invoke("get_image", bytes));
	if (!resp.length) {
		return null
	}
	return resp
}

export function useImageUrl(id: int): string | null {
	const { data: blob } = api.useGetImageQuery(id)
	const href = useObjectUrl(blob);
	return href
}
function showModal(arg0: ConfirmModal) {
	throw new Error('Function not implemented.');
}

