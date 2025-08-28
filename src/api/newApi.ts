import { invoke } from "@tauri-apps/api/core"
import { createMutation, createQuery, invalidate, queryClient } from "./helpers"
import { Game, ImageMetadata, ModInfo, ModType, Project, ProjectType, TowermodConfig } from '@towermod'
import { useQuery } from "@tanstack/react-query"
import { binaryInvoke, enhanceModInfo, svgToDataUri } from "@/util"


const tags = {
	modInfo: ['ModInfo'],
	modCache: ['ModInfo', 'Cache'],
	game: ['Game'],
	data: ['Game', 'Data'],
	project: ['Game', 'Data', 'Project'],
	image: ['Game', 'Data', 'Image'],
}

export const [getFile, useGetFile] = createQuery({
	queryFn: async (path?: string | null) => {
		return path ? await _getFileBlob(path) : null
	},
	queryKey: (path) => ['file', { path }],
	// should discard data from the cache almost immediately after use, as files on-disk can always change
	staleTime: 0,
	gcTime: 1000,
})

export const [getGame, useGetGame] = createQuery({
	queryFn: async () => {
		const game: Game = await invoke('get_game')
		return game ?? null
	},
	queryKey: tags.game,
})
export const [getProject, useGetProject] = createQuery({
	queryFn: async () => {
		const project: Project = await invoke('get_project')
		return project ?? null
	},
	queryKey: tags.project,
})
export const [getInstalledMods, useGetInstalledMods] = createQuery({
	queryFn: async () => {
		const mods: ModInfo[] = await binaryInvoke('get_installed_mods')
		for (const mod of mods) { enhanceModInfo(mod) }
		return mods
	},
	queryKey: tags.modInfo,
})
export const [installMod, useInstallMod] = createMutation({
	mutationFn: async (resource: string) => {
		return enhanceModInfo(await binaryInvoke('install_mod', [resource]))
	},
	onMutate: () => invalidate(tags.modInfo)
})
export const [isDataLoaded, useIsDataLoaded] = createQuery({
	queryFn: () => invoke<boolean>('is_data_loaded'),
	queryKey: tags.data,
})
export const [setGame, useSetGame] = createMutation({
	mutationFn: async (filePath: string | null) => {
		await invoke('set_game', { filePath: filePath || null })
	},
	onMutate: () => invalidate(tags.game),
})
export const [newProject, useNewProject] = createMutation({
	mutationFn: async () => {
		await invoke('new_project')
	},
	onMutate: () => invalidate(tags.project),
})
export const [exportMod, useExportMod] = createMutation({
	mutationFn: async (modType: ModType) => {
		await invoke('export_mod', { modType})
	},
	onMutate: () => invalidate(tags.modInfo),
})

// loadManifest: builder.query<Project, { manifestPath: string, projectType: ProjectType }>({
// 	query: async (arg) => {
// 		return await invoke('load_manifest', arg)
// 	},
// }),
export const [loadManifest, useLoadManifest] = createQuery({
	queryFn: async (arg: { manifestPath: string, projectType: ProjectType }) => {
		return await invoke('load_manifest', arg)
	},
	queryKey: ({ manifestPath, projectType }) => ['file', { path: manifestPath, projectType }],
	// should discard data from the cache almost immediately after use, as files on-disk can always change
	staleTime: 0,
	gcTime: 1000,
})

// exportFromFiles: builder.mutation<void, Project>({
// 	query: async (project) => {
// 		await invoke('export_from_files', { project })
// 	},
// 	invalidatesTags: ['ModInfo']
// }),
export const [exportFromFiles, useExportFromFiles] = createMutation({
	mutationFn: async (project: Project) => {
		await invoke('export_from_files', { project })
	},
	onMutate: () => invalidate(tags.modInfo),
})

// exportFromLegacy: builder.mutation<void, { patchPath: string, project: Project }>({
// 	query: async (arg) => {
// 		await invoke('export_from_legacy', arg)
// 	},
// 	invalidatesTags: ['ModInfo']
// }),
export const [exportFromLegacy, useExportFromLegacy] = createMutation({
	mutationFn: async (arg: { patchPath: string, project: Project }) => {
		await invoke('export_from_legacy', arg)
	},
	onMutate: () => invalidate(tags.modInfo),
})

// playMod: builder.mutation<number, string>({
// 	query: async (zipPath) => {
// 		return await invoke('play_mod', { zipPath })
// 	},
// 	invalidatesTags: ['ModCache']
// }),
export const [playMod, usePlayMod] = createMutation({
	mutationFn: async (zipPath: string) => {
		return await invoke<number>('play_mod', { zipPath })
	},
	onMutate: () => invalidate(tags.modCache)
})

// playProject: builder.mutation<number, boolean>({
// 	query: async (debug) => {
// 		return await invoke('play_project', { debug })
// 	},
// }),
export const [playProject, usePlayProject] = createMutation({
	mutationFn: async (debug: boolean) => {
		return await invoke<number>('play_project', { debug })
	},
	onMutate: () => invalidate(['Project'])
})

// playVanilla: builder.mutation<number, void>({
// 	query: async () => {
// 		return await invoke('play_vanilla')
// 	},
// }),
export const [playVanilla, usePlayVanilla] = createMutation({
	mutationFn: async () => {
		return await invoke<number>('play_vanilla')
	},
})

// getPixelatedSvg: builder.query<string | null, string>({
// 	query: async (href) => {
// 		const data = await fetch(href).then(res => res.text())
// 		if (!data) { return null }
// 		const svgDoc = (new DOMParser).parseFromString(data, 'image/svg+xml')
// 		const svg = svgDoc.querySelector('svg')
// 		if (!svg) {
// 			console.error("SVG not found in loaded content")
// 			return null
// 		}
// 		svg.setAttribute('shape-rendering', 'crispEdges')
// 		const url = svgToDataUri(svg)
// 		return url
// 	}
// }),
export const [getPixelatedSvg, useGetPixelatedSvg] = createQuery({
	queryFn: async (href: string) => {
		const data = await fetch(href).then(res => res.text())
		if (!data) { return null }
		const svgDoc = (new DOMParser).parseFromString(data, 'image/svg+xml')
		const svg = svgDoc.querySelector('svg')
		if (!svg) {
			console.error("SVG not found in loaded content")
			return null
		}
		svg.setAttribute('shape-rendering', 'crispEdges')
		const url = svgToDataUri(svg)
		return url
	},
	queryKey: (href) => ['getPixelatedSvg', href],
})


// init: builder.mutation<void, void>({
// 	query: async () => {
// 		await invoke('init')
// 	},
// 	invalidatesTags: tagTypes
// }),
export const [init, useInit] = createMutation({
	mutationFn: async () => {
		await invoke('init')
	},
	onMutate: () => {
		queryClient.getQueryCache().clear()
		queryClient.getMutationCache().clear()
	}
})


// loadProjectPreflight: builder.mutation<string, string>({
// 	query: async (manifestPath) => {
// 		return await invoke('load_project_preflight', { manifestPath })
// 	},
// 	invalidatesTags: [],
// }),
export const [loadProjectPreflight, useLoadProjectPreflight] = createMutation({
	mutationFn: async (manifestPath: string) => {
		return await invoke<string>('load_project_preflight', { manifestPath })
	},
})

// loadProject: builder.mutation<void, string>({
// 	query: async (manifestPath) => {
// 		return await invoke('load_project', { manifestPath })
// 	},
// 	invalidatesTags: ['Project', ...cstcObjectTagTypes],
// }),

export const [loadProject, useLoadProject] = createMutation({
	mutationFn: async (manifestPath: string) => {
		return await invoke('load_project', { manifestPath })
	},
	onMutate: () => invalidate(tags.data),
})

// editProjectInfo: builder.mutation<void, Project>({
// 	query: async (project) => {
// 		return await invoke('edit_project_info', { project })
// 	},
// 	invalidatesTags: ['Project'],
// }),
export const [editProjectInfo, useEditProjectInfo] = createMutation({
	mutationFn: async (project: Project) => {
		return await invoke('edit_project_info', { project })
	},
	onMutate: () => invalidate(tags.project),
})

// saveProject: builder.mutation<void, string>({
// 	query: async (dirPath) => {
// 		return await invoke('save_project', { dirPath })
// 	},
// 	invalidatesTags: ['Project'],
// }),

export const [saveProject, useSaveProject] = createMutation({
	mutationFn: async (dirPath: string) => {
		return await invoke('save_project', { dirPath })
	},
	onMutate: () => invalidate(tags.project),
})

// saveNewProject: builder.mutation<void, { dirPath: string, author: string, name: string, displayName: string }>({
// 	query: async (args) => await invoke('save_new_project', args),
// 	invalidatesTags: ['Project'],
// }),
export const [saveNewProject, useSaveNewProject] = createMutation({
	mutationFn: async (args: { dirPath: string, author: string, name: string, displayName: string }) => await invoke('save_new_project', args),
	onMutate: () => invalidate(tags.project),
})

// dumpImages: builder.mutation<void, void>({
// 	query: async () => {
// 		return await invoke('dump_images')
// 	},
// 	invalidatesTags: ['Game', 'Image']
// }),
export const [dumpImages, useDumpImages] = createMutation({
	mutationFn: async () => {
		await invoke('dump_images')
	},
	onMutate: () => invalidate(tags.image)
})

// imageDumpDirPath: builder.query<string | null, void>({
// 	query: async () => {
// 		return await invoke('image_dump_dir_path') ?? null
// 	},
// 	providesTags: ['Game', { type: 'Image', id: 'DUMP' }]
// }),
export const [imageDumpDirPath, useImageDumpDirPath] = createQuery({
	queryFn: async () => {
		return await invoke<string | undefined>('image_dump_dir_path') ?? null
	},
	queryKey: [tags.image],
})

// modCacheExists: builder.query<boolean, ModInfo>({
// 	query: async (modInfo) => {
// 		return await invoke('mod_cache_exists', { modInfo })
// 	},
// 	providesTags: ['ModCache', 'ModInfo']
// }),
export const [modCacheExists, useModCacheExists] = createQuery({
	queryFn: async (modInfo: ModInfo) => {
		return await invoke<boolean>('mod_cache_exists', { modInfo })
	},
	queryKey: [tags.modCache],
})
// clearModCache: builder.mutation<void, ModInfo>({
// 	query: async (modInfo) => {
// 		await invoke('clear_mod_cache', { modInfo })
// 	},
// 	invalidatesTags: ['ModCache']
// }),
export const [clearModCache, useClearModCache] = createMutation({
	mutationFn: async (modInfo: ModInfo) => {
		await invoke('clear_mod_cache', { modInfo })
	},
	onMutate: () => invalidate(tags.modCache),
})

// // config
// getConfig: builder.query<TowermodConfig, void>({
// 	query: async () => {
// 		return await invoke('get_config')
// 	},
// 	providesTags: ['TowermodConfig']
// }),
export const [getConfig, useGetConfig] = createQuery({
	queryFn: async () => {
		return await invoke<TowermodConfig>('get_config')
	},
	queryKey: ['TowermodConfig'],
})

// saveConfig: builder.mutation<void, void>({
// 	query: async () => {
// 		await invoke('save_config')
// 	},
// }),
export const [saveConfig, useSaveConfig] = createMutation({
	mutationFn: async () => {
		await invoke('save_config')
	},
})

// loadConfig: builder.mutation<void, void>({
// 	query: async () => {
// 		await invoke('load_config')
// 	},
// 	invalidatesTags: ['TowermodConfig'],
// }),
export const [loadConfig, useLoadConfig] = createMutation({
	mutationFn: async () => {
		await invoke('load_config')
	},
	onMutate: () => invalidate(['TowermodConfig']),
})

// cachePath: builder.query<string, void>({
// 	query: async () => {
// 		return await invoke('get_cache_dir_path')
// 	},
// }),

export const [cachePath, useCachePath] = createQuery({
	queryFn: async () => {
		return await invoke<string>('get_cache_dir_path')
	},
	queryKey: ['cachePath'],
})

// modsPath: builder.query<string, void>({
// 	query: async () => {
// 		return await invoke('get_mods_dir_path')
// 	},
// }),
export const [modsPath, useModsPath] = createQuery({
	queryFn: async () => {
		return await invoke<string>('get_mods_dir_path')
	},
	queryKey: ['modsPath'],
})

// projectsPath: builder.query<string, void>({
// 	query: async () => {
// 		return await invoke('get_default_project_dir_path')
// 	},
// }),
export const [getDefaultProjectDirPath, useGetDefaultProjectDirPath] = createQuery({
	queryFn: async () => {
		return await invoke<string>('get_default_project_dir_path')
	},
	queryKey: ['defaultProjectDirPath'],
})

// clearGameCache: builder.mutation<void, void>({
// 	query: async () => {
// 		await invoke('clear_game_cache')
// 	},
// }),
export const [clearGameCache, useClearGameCache] = createMutation({
	mutationFn: async () => {
		await invoke('clear_game_cache')
	},
})

// nukeCache: builder.mutation<void, void>({
// 	query: async () => {
// 		await invoke('nuke_cache')
// 	},
// }),
export const [nukeCache, useNukeCache] = createMutation({
	mutationFn: async () => {
		await invoke('nuke_cache')
	},
})


async function _getFile(path: string): Promise<Uint8Array | null> {
	const enc = new TextEncoder()
	const bytes = enc.encode(JSON.stringify(path))
	const resp = new Uint8Array(await invoke("get_file", bytes))
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
		let options: BlobPropertyBag | undefined
		switch (fileExtension) {
			case '.jpg': case '.jpeg': {
				options = { type: 'image/jpeg' }
			} break; case '.png':
				options = { type: 'image/png' }
		}
		blob = new Blob([arrayBuffer], options)
	}
	return blob
}