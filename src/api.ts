import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { int } from '@/util/util';
import { invoke } from "@tauri-apps/api/core";
import { Game, ModInfo, ModType, Project, ProjectType, TowermodConfig } from '@towermod';
import type { BaseEndpointDefinition } from '@reduxjs/toolkit/query'
import { useObjectUrl } from './util/hooks';
import { toast } from '@/app/Toast';
import { renderError } from './components/Error';


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
			toast(renderError(e), { type: 'error' })
			console.error(e)
			return {
				error: e as any,
			}
		}
	}
}

const tagTypes = ['Project', 'Game', 'Data', 'Image', 'ModInfo', 'ModCache', 'TowermodConfig'] as const;

export const api = createApi({
	reducerPath: 'api',
	baseQuery: fetchBaseQuery({ baseUrl: '/' }), // Base URL for API calls
	tagTypes,
	endpoints: (builder) => ({
		getFile: builder.query<Blob | null, string | null | undefined>({
			queryFn: queryFn(async (path) => {
				const arrayBuffer = path ? await _getFile(path) : null
				let blob: Blob | null = null
				if (arrayBuffer) {
					const fileExtension = path!.split('.').pop()?.toLowerCase()
					let options: BlobPropertyBag | undefined;
					switch (fileExtension) {
						case '.jpg': case '.jpeg':
							options = { type: 'image/jpeg' }
						break; case '.png':
							options = { type: 'image/png' }
					}
					blob = new Blob([arrayBuffer], options)
				}
				return blob
			}),
		}),

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

		getGame: builder.query<Game | undefined, void>({
			queryFn: queryFn(async () => {
				const game: Game = await invoke('get_game')
				return game ?? undefined
			}),
			providesTags: ['Game'],
		}),
		getProject: builder.query<Project | undefined, void>({
			queryFn: queryFn(async () => {
				const project: Project = await invoke('get_project')
				return project ?? undefined
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
		exportMod: builder.mutation<void, ModType>({
			queryFn: queryFn(async (modType) => {
				await invoke('export_mod', { modType })
			}),
			invalidatesTags: ['ModInfo']
		}),
		loadManifest: builder.query<Project, { manifestPath: string, projectType: ProjectType }>({
			queryFn: queryFn(async (arg) => {
				return await invoke('load_manifest', arg)
			}),
		}),
		exportFromFiles: builder.mutation<void, Project>({
			queryFn: queryFn(async (project) => {
				await invoke('export_from_files', { project })
			}),
			invalidatesTags: ['ModInfo']
		}),
		exportFromLegacy: builder.mutation<void, { patchPath: string, project: Project }>({
			queryFn: queryFn(async (arg) => {
				await invoke('export_from_legacy', arg)
			}),
			invalidatesTags: ['ModInfo']
		}),
		playMod: builder.mutation<void, string>({
			queryFn: queryFn(async (zipPath) => {
				await invoke('play_mod', { zipPath })
			}),
			invalidatesTags: ['ModCache']
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

		loadProjectPreflight: builder.mutation<void, string>({
			queryFn: queryFn(async (manifestPath) => {
				return await invoke('load_project_preflight', { manifestPath })
			}),
			invalidatesTags: [],
		}),

		loadProject: builder.mutation<void, string>({
			queryFn: queryFn(async (manifestPath) => {
				return await invoke('load_project', { manifestPath })
			}),
			invalidatesTags: ['Project', 'Data'],
		}),

		editProjectInfo: builder.mutation<void, Project>({
			queryFn: queryFn(async (project) => {
				return await invoke('edit_project_info', { project })
			}),
			invalidatesTags: ['Project'],
		}),

		saveProject: builder.mutation<void, string>({
			queryFn: queryFn(async (dirPath) => {
				return await invoke('save_project', { dirPath })
			}),
			invalidatesTags: ['Project'],
		}),

		saveNewProject: builder.mutation<void, { dirPath: string, author: string, name: string, displayName: string }>({
			queryFn: queryFn(async (dirPath) => {
				return await invoke('save_new_project', { dirPath })
			}),
			invalidatesTags: ['Project'],
		}),

		dumpImages: builder.mutation<void, void>({
			queryFn: queryFn(async () => {
				return await invoke('dump_images')
			}),
		}),

		modCacheExists: builder.query<boolean, ModInfo>({
			queryFn: queryFn(async (modInfo) => {
				return await invoke('mod_cache_exists', { modInfo })
			}),
			providesTags: ['ModCache', 'ModInfo']
		}),
		clearModCache: builder.mutation<void, ModInfo>({
			queryFn: queryFn(async (modInfo) => {
				await invoke('clear_mod_cache', { modInfo })
			}),
			invalidatesTags: ['ModCache']
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
		modsPath: builder.query<string, void>({
			queryFn: queryFn(async () => {
				return await invoke('get_mods_dir_path')
			}),
		}),
		projectsPath: builder.query<string, void>({
			queryFn: queryFn(async () => {
				return await invoke('get_default_project_dir_path')
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

async function _getFile(path: string): Promise<Uint8Array | null> {
	const enc = new TextEncoder();
	const bytes = enc.encode(JSON.stringify(path))
	const resp = new Uint8Array(await invoke("get_file", bytes));
	if (!resp.length) {
		return null
	}
	return resp
}

async function _getGameImage(id: int): Promise<Uint8Array | null> {
	const enc = new TextEncoder();
	const bytes = enc.encode(JSON.stringify(id))
	const resp = new Uint8Array(await invoke("get_image", bytes));
	if (!resp.length) {
		return null
	}
	return resp
}


export function useFileUrl(path: string | null | undefined): string | undefined {
	const { data: blob } = api.useGetFileQuery(path)
	const href = useObjectUrl(blob);
	return href ?? undefined
}

export function useGameImageUrl(id: int): string | undefined {
	const { data: blob } = api.useGetGameImageQuery(id)
	const href = useObjectUrl(blob);
	return href ?? undefined
}
