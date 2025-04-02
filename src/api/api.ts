import { createApi } from '@reduxjs/toolkit/query/react'
import { invoke } from "@tauri-apps/api/core";
import { Game, ImageMetadata, ModInfo, ModType, Project, ProjectType, TowermodConfig } from '@towermod';
import { useObjectUrl } from '@/util/hooks';
import { customBaseQuery } from './baseApiUtil';
import { binaryInvoke, enhanceModInfo, svgToDataUri } from '@/util';

const cstcObjectTagTypes = [
	'Data', 'Image', 'ImageMetadata', 'ObjectType', 'ObjectInstance', 'Behavior', 'Container', 'Family', 'ObjectTrait', 'AppBlock', 'Layout', 'LayoutLayer', 'Animation'
] as const
const tagTypes = [
	'Project', 'Game', 'ModInfo', 'ModCache', 'TowermodConfig', ...cstcObjectTagTypes
] as const

export const baseApi = createApi({
	reducerPath: 'api',
	baseQuery: customBaseQuery, // Base URL for API calls
	tagTypes,
	keepUnusedDataFor: 1,
	endpoints: (builder) => ({
		getFile: builder.query<Blob | null, string | null | undefined>({
			query: async (path) => {
				const blob = path ? await _getFileBlob(path) : null
				return blob
			},

			// should discard data from the cache almost immediately after use, as files on-disk can always change
			keepUnusedDataFor: 1,
		}),
		getFileUrl: builder.query<string | null, string | null | undefined>({
			query: async (path) => {
				const blob = path ? await _getFileBlob(path) : null
				return blob
			},
			// should discard data from the cache almost immediately after use, as files on-disk can always change
			keepUnusedDataFor: 1,
		}),


		getGame: builder.query<Game | null, void>({
			query: async () => {
				const game: Game = await invoke('get_game')
				return game ?? null
			},
			providesTags: ['Game'],
		}),
		getProject: builder.query<Project | null, void>({
			query: async () => {
				const project: Project = await invoke('get_project')
				return project ?? null
			},
			providesTags: ['Project'],
		}),
		getInstalledMods: builder.query<ModInfo[], void>({
			query: async () => {
				const mods: ModInfo[] = await binaryInvoke('get_installed_mods')
				for (const mod of mods) { enhanceModInfo(mod) }
				return mods
			},
			providesTags: ['ModInfo'],
		}),
		installMod: builder.mutation<ModInfo, string>({
			query: async (resource) => {
				return enhanceModInfo(await binaryInvoke('install_mod', [resource]))
			},
			invalidatesTags: ['ModInfo'],
		}),
		isDataLoaded: builder.query<boolean, void>({
			query: async () => {
				return await invoke('is_data_loaded')
			},
			providesTags: ['Data'],
		}),
		setGame: builder.mutation<void, string | null>({
			query: async (filePath) => {
				await invoke('set_game', { filePath: filePath || null })
			},
			invalidatesTags: ['Project', 'Game', ...cstcObjectTagTypes],
		}),
		newProject: builder.mutation<void, void>({
			query: async () => {
				await invoke('new_project')
			},
			invalidatesTags: ['Project', ...cstcObjectTagTypes],
		}),
		exportMod: builder.mutation<void, ModType>({
			query: async (modType) => {
				await invoke('export_mod', { modType })
			},
			invalidatesTags: ['ModInfo']
		}),
		loadManifest: builder.query<Project, { manifestPath: string, projectType: ProjectType }>({
			query: async (arg) => {
				return await invoke('load_manifest', arg)
			},
		}),
		exportFromFiles: builder.mutation<void, Project>({
			query: async (project) => {
				await invoke('export_from_files', { project })
			},
			invalidatesTags: ['ModInfo']
		}),
		exportFromLegacy: builder.mutation<void, { patchPath: string, project: Project }>({
			query: async (arg) => {
				await invoke('export_from_legacy', arg)
			},
			invalidatesTags: ['ModInfo']
		}),
		playMod: builder.mutation<number, string>({
			query: async (zipPath) => {
				return await invoke('play_mod', { zipPath })
			},
			invalidatesTags: ['ModCache']
		}),
		playProject: builder.mutation<number, boolean>({
			query: async (debug) => {
				return await invoke('play_project', { debug })
			},
		}),
		playVanilla: builder.mutation<number, void>({
			query: async () => {
				return await invoke('play_vanilla')
			},
		}),
		getText: builder.query<string, string>({
			query: (arg) => ({ url: arg, responseHandler: 'text' })
		}),
		getPixelatedSvg: builder.query<string | null, string>({
			query: async (href) => {
				const data = await fetch(href).then(res => res.text())
				if (!data) { return null }
				const svgDoc = (new DOMParser).parseFromString(data, 'image/svg+xml');
				const svg = svgDoc.querySelector('svg')
				if (!svg) {
					console.error("SVG not found in loaded content");
					return null
				}
				svg.setAttribute('shape-rendering', 'crispEdges');
				const url = svgToDataUri(svg);
				return url
			}
		}),


		init: builder.mutation<void, void>({
			query: async () => {
				await invoke('init')
			},
			invalidatesTags: tagTypes
		}),

		loadProjectPreflight: builder.mutation<string, string>({
			query: async (manifestPath) => {
				return await invoke('load_project_preflight', { manifestPath })
			},
			invalidatesTags: [],
		}),

		loadProject: builder.mutation<void, string>({
			query: async (manifestPath) => {
				return await invoke('load_project', { manifestPath })
			},
			invalidatesTags: ['Project', ...cstcObjectTagTypes],
		}),

		editProjectInfo: builder.mutation<void, Project>({
			query: async (project) => {
				return await invoke('edit_project_info', { project })
			},
			invalidatesTags: ['Project'],
		}),

		saveProject: builder.mutation<void, string>({
			query: async (dirPath) => {
				return await invoke('save_project', { dirPath })
			},
			invalidatesTags: ['Project'],
		}),

		saveNewProject: builder.mutation<void, { dirPath: string, author: string, name: string, displayName: string }>({
			query: async (args) => await invoke('save_new_project', args),
			invalidatesTags: ['Project'],
		}),

		dumpImages: builder.mutation<void, void>({
			query: async () => {
				return await invoke('dump_images')
			},
			invalidatesTags: ['Game', 'Image']
		}),

		imageDumpDirPath: builder.query<string | null, void>({
			query: async () => {
				return await invoke('image_dump_dir_path') ?? null
			},
			providesTags: ['Game', { type: 'Image', id: 'DUMP' }]
		}),

		modCacheExists: builder.query<boolean, ModInfo>({
			query: async (modInfo) => {
				return await invoke('mod_cache_exists', { modInfo })
			},
			providesTags: ['ModCache', 'ModInfo']
		}),
		clearModCache: builder.mutation<void, ModInfo>({
			query: async (modInfo) => {
				await invoke('clear_mod_cache', { modInfo })
			},
			invalidatesTags: ['ModCache']
		}),

		// config
		getConfig: builder.query<TowermodConfig, void>({
			query: async () => {
				return await invoke('get_config')
			},
			providesTags: ['TowermodConfig']
		}),
		saveConfig: builder.mutation<void, void>({
			query: async () => {
				await invoke('save_config')
			},
		}),
		loadConfig: builder.mutation<void, void>({
			query: async () => {
				await invoke('load_config')
			},
			invalidatesTags: ['TowermodConfig'],
		}),
		cachePath: builder.query<string, void>({
			query: async () => {
				return await invoke('get_cache_dir_path')
			},
		}),
		modsPath: builder.query<string, void>({
			query: async () => {
				return await invoke('get_mods_dir_path')
			},
		}),
		projectsPath: builder.query<string, void>({
			query: async () => {
				return await invoke('get_default_project_dir_path')
			},
		}),
		clearGameCache: builder.mutation<void, void>({
			query: async () => {
				await invoke('clear_game_cache')
			},
		}),
		nukeCache: builder.mutation<void, void>({
			query: async () => {
				await invoke('nuke_cache')
			},
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
async function _getFileBlob(path: string): Promise<Blob | null> {
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
}

