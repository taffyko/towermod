import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { invoke } from "@tauri-apps/api/core";
import { Game, ImageMetadata, ModInfo, ModType, Project, ProjectType, TowermodConfig } from '@towermod';
import { useObjectUrl } from '@/util/hooks';
import { queryFn } from './baseApiUtil';
import { enhanceModInfo } from '@/util';




const tagTypes = [
	'Project', 'Game', 'Data', 'ModInfo', 'ModCache', 'TowermodConfig',
	// game data objects
	'Image', 'ImageMetadata', 'ObjectType'
] as const;

export const baseApi = createApi({
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
			// should discard data from the cache almost immediately after use, as files on-disk can always change
			keepUnusedDataFor: 1,
		}),


		getGame: builder.query<Game | null, void>({
			queryFn: queryFn(async () => {
				const game: Game = await invoke('get_game')
				return game ?? null
			}),
			providesTags: ['Game'],
		}),
		getProject: builder.query<Project | null, void>({
			queryFn: queryFn(async () => {
				const project: Project = await invoke('get_project')
				return project ?? null
			}),
			providesTags: ['Project'],
		}),
		getInstalledMods: builder.query<ModInfo[], void>({
			queryFn: queryFn(async () => {
				const mods: ModInfo[] = await invoke('get_installed_mods')
				for (const mod of mods) { enhanceModInfo(mod) }
				return mods
			}),
			providesTags: ['ModInfo'],
		}),
		installMod: builder.mutation<ModInfo, string>({
			queryFn: queryFn(async (resource) => {
				return enhanceModInfo(await invoke('install_mod', { resource }))
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
		playMod: builder.mutation<number, string>({
			queryFn: queryFn(async (zipPath) => {
				return await invoke('play_mod', { zipPath })
			}),
			invalidatesTags: ['ModCache']
		}),
		playProject: builder.mutation<number, boolean>({
			queryFn: queryFn(async (debug) => {
				return await invoke('play_project', { debug })
			}),
		}),
		playVanilla: builder.mutation<number, void>({
			queryFn: queryFn(async () => {
				return await invoke('play_vanilla')
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

		loadProjectPreflight: builder.mutation<string, string>({
			queryFn: queryFn(async (manifestPath) => {
				return await invoke('load_project_preflight', { manifestPath })
			}),
			invalidatesTags: [],
		}),

		loadProject: builder.mutation<void, string>({
			queryFn: queryFn(async (manifestPath) => {
				return await invoke('load_project', { manifestPath })
			}),
			invalidatesTags: ['Project', 'Data', 'ObjectType', 'ImageMetadata', 'Image'],
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

		imageDumpDirPath: builder.query<string | null, void>({
			queryFn: queryFn(async () => {
				return await invoke('image_dump_dir_path') ?? null
			}),
			providesTags: ['Game']
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

export const dataApi = baseApi.injectEndpoints({
	endpoints: (builder) => ({
		getImageMetadata: builder.query<ImageMetadata | null, number>({
			queryFn: queryFn(async (id) => {
				const metadata: ImageMetadata = await invoke('get_image_metadata', { id }) ?? null
				if (metadata) {
					metadata._type = 'ImageMetadata'
					for (const apoint of metadata.apoints) { apoint._type = 'ActionPoint' }
				}
				return metadata
			}),
			providesTags: ['ImageMetadata']
		}),
		setImageMetadata: builder.mutation<void, ImageMetadata>({
			queryFn: queryFn(async (data) => {
				return await invoke('set_image_metadata', { data })
			}),
			invalidatesTags: ['ImageMetadata']
		}),
	}),
})

async function _getFile(path: string): Promise<Uint8Array | null> {
	const enc = new TextEncoder();
	const bytes = enc.encode(JSON.stringify(path))
	const resp = new Uint8Array(await invoke("get_file", bytes));
	if (!resp.length) {
		return null
	}
	return resp
}

export function useFileUrl(path: string | null | undefined): string | undefined {
	const { data: blob } = baseApi.useGetFileQuery(path)
	const href = useObjectUrl(blob);
	return href ?? undefined
}
