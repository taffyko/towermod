import { binaryInvoke, enhanceModInfo, svgToDataUri } from "@/util"
import { invoke } from "@tauri-apps/api/core"
import { Game, ModInfo, ModType, Project, ProjectType, TowermodConfig } from '@towermod'
import { createMutation, createQuery, invalidate, queryClient } from "./helpers"


const tags = {
	modInfo: ['ModInfo'],
	modCache: ['ModInfo', 'Cache'],
	game: ['Game'],
	data: ['Game', 'Data'],
	project: ['Game', 'Data', 'Project'],
	image: ['Game', 'Data', 'Image'],
}

export const getFile = createQuery({
	queryFn: async (path?: string | null) => {
		return path ? await _getFileBlob(path) : null
	},
	queryKey: (path) => ['file', { path }],
	// should discard data from the cache almost immediately after use, as files on-disk can always change
	staleTime: 0,
	gcTime: 1000,
})

export const getGame = createQuery({
	queryFn: async () => {
		const game: Game = await invoke('get_game')
		console.log('get_game', game) // FIXME
		return game ?? null
	},
	queryKey: tags.game,
})

export const getProject = createQuery({
	queryFn: async () => {
		const project: Project = await invoke('get_project')
		return project ?? null
	},
	queryKey: tags.project,
})
export const getInstalledMods = createQuery({
	queryFn: async () => {
		const mods: ModInfo[] = await binaryInvoke('get_installed_mods')
		for (const mod of mods) { enhanceModInfo(mod) }
		return mods
	},
	queryKey: tags.modInfo,
})
export const installMod = createMutation({
	mutationFn: async (resource: string) => {
		return enhanceModInfo(await binaryInvoke('install_mod', [resource]))
	},
	onSuccess: async () => {
		invalidate(tags.modInfo)
	}
})
export const isDataLoaded = createQuery({
	queryFn: () => invoke<boolean>('is_data_loaded'),
	queryKey: tags.data,
})
export const setGame = createMutation({
	mutationFn: async (filePath: string | null) => {
		await invoke('set_game', { filePath: filePath || null })
	},
	onSuccess: () => invalidate(tags.game),
})
export const newProject = createMutation({
	mutationFn: async () => {
		await invoke('new_project')
	},
	onSuccess: () => invalidate(tags.project, tags.data),
})
export const exportMod = createMutation({
	mutationFn: async (modType: ModType) => {
		await invoke('export_mod', { modType})
	},
	onSuccess: () => invalidate(tags.modInfo),
})

// loadManifest: builder.query<Project, { manifestPath: string, projectType: ProjectType }>({
// 	query: async (arg) => {
// 		return await invoke('load_manifest', arg)
// 	},
// }),
export const loadManifest = createQuery({
	queryFn: async (arg: { manifestPath: string, projectType: ProjectType }) => {
		return await invoke<Project>('load_manifest', arg)
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
export const exportFromFiles = createMutation({
	mutationFn: async (project: Project) => {
		await invoke('export_from_files', { project })
	},
	onSuccess: () => invalidate(tags.modInfo),
})

// exportFromLegacy: builder.mutation<void, { patchPath: string, project: Project }>({
// 	query: async (arg) => {
// 		await invoke('export_from_legacy', arg)
// 	},
// 	invalidatesTags: ['ModInfo']
// }),
export const exportFromLegacy = createMutation({
	mutationFn: async (arg: { patchPath: string, project: Project }) => {
		await invoke('export_from_legacy', arg)
	},
	onSuccess: () => invalidate(tags.modInfo),
})

// playMod: builder.mutation<number, string>({
// 	query: async (zipPath) => {
// 		return await invoke('play_mod', { zipPath })
// 	},
// 	invalidatesTags: ['ModCache']
// }),
export const playMod = createMutation({
	mutationFn: async (zipPath: string) => {
		return await invoke<number>('play_mod', { zipPath })
	},
	onSuccess: () => invalidate(tags.modCache)
})

// playProject: builder.mutation<number, boolean>({
// 	query: async (debug) => {
// 		return await invoke('play_project', { debug })
// 	},
// }),
export const playProject = createMutation({
	mutationFn: async (debug: boolean) => {
		return await invoke<number>('play_project', { debug })
	},
	onSuccess: () => invalidate(['Project'])
})

// playVanilla: builder.mutation<number, void>({
// 	query: async () => {
// 		return await invoke('play_vanilla')
// 	},
// }),
export const playVanilla = createMutation({
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
export const getPixelatedSvg = createQuery({
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
export const init = createMutation({
	mutationFn: async () => {
		await invoke('init')
	},
	onSuccess: () => {
		invalidate(tags.game, tags.modInfo)
	}
})


// loadProjectPreflight: builder.mutation<string, string>({
// 	query: async (manifestPath) => {
// 		return await invoke('load_project_preflight', { manifestPath })
// 	},
// 	invalidatesTags: [],
// }),
export const loadProjectPreflight = createMutation({
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

export const loadProject = createMutation({
	mutationFn: async (manifestPath: string) => {
		return await invoke('load_project', { manifestPath })
	},
	onSuccess: () => invalidate(tags.data),
})

// editProjectInfo: builder.mutation<void, Project>({
// 	query: async (project) => {
// 		return await invoke('edit_project_info', { project })
// 	},
// 	invalidatesTags: ['Project'],
// }),
export const editProjectInfo = createMutation({
	mutationFn: async (project: Project) => {
		return await invoke('edit_project_info', { project })
	},
	onSuccess: () => invalidate(tags.project),
})

// saveProject: builder.mutation<void, string>({
// 	query: async (dirPath) => {
// 		return await invoke('save_project', { dirPath })
// 	},
// 	invalidatesTags: ['Project'],
// }),

export const saveProject = createMutation({
	mutationFn: async (dirPath: string) => {
		return await invoke('save_project', { dirPath })
	},
	onSuccess: () => invalidate(tags.project),
})

// saveNewProject: builder.mutation<void, { dirPath: string, author: string, name: string, displayName: string }>({
// 	query: async (args) => await invoke('save_new_project', args),
// 	invalidatesTags: ['Project'],
// }),
export const saveNewProject = createMutation({
	mutationFn: async (args: { dirPath: string, author: string, name: string, displayName: string }) => await invoke('save_new_project', args),
	onSuccess: () => invalidate(tags.project),
})

// dumpImages: builder.mutation<void, void>({
// 	query: async () => {
// 		return await invoke('dump_images')
// 	},
// 	invalidatesTags: ['Game', 'Image']
// }),
export const dumpImages = createMutation({
	mutationFn: async () => {
		await invoke('dump_images')
	},
	onSuccess: () => invalidate(tags.image)
})

// imageDumpDirPath: builder.query<string | null, void>({
// 	query: async () => {
// 		return await invoke('image_dump_dir_path') ?? null
// 	},
// 	providesTags: ['Game', { type: 'Image', id: 'DUMP' }]
// }),
export const imageDumpDirPath = createQuery({
	queryFn: async () => {
		return await invoke<string | undefined>('image_dump_dir_path') ?? null
	},
	queryKey: tags.image,
})

// modCacheExists: builder.query<boolean, ModInfo>({
// 	query: async (modInfo) => {
// 		return await invoke('mod_cache_exists', { modInfo })
// 	},
// 	providesTags: ['ModCache', 'ModInfo']
// }),
export const modCacheExists = createQuery({
	queryFn: async (modInfo: ModInfo) => {
		return await invoke<boolean>('mod_cache_exists', { modInfo })
	},
	queryKey: tags.modCache,
})
// clearModCache: builder.mutation<void, ModInfo>({
// 	query: async (modInfo) => {
// 		await invoke('clear_mod_cache', { modInfo })
// 	},
// 	invalidatesTags: ['ModCache']
// }),
export const clearModCache = createMutation({
	mutationFn: async (modInfo: ModInfo) => {
		await invoke('clear_mod_cache', { modInfo })
	},
	onSuccess: () => invalidate(tags.modCache),
})

// // config
// getConfig: builder.query<TowermodConfig, void>({
// 	query: async () => {
// 		return await invoke('get_config')
// 	},
// 	providesTags: ['TowermodConfig']
// }),
export const getConfig = createQuery({
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
export const saveConfig = createMutation({
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
export const loadConfig = createMutation({
	mutationFn: async () => {
		await invoke('load_config')
	},
	onSuccess: () => invalidate(['TowermodConfig']),
})

// cachePath: builder.query<string, void>({
// 	query: async () => {
// 		return await invoke('get_cache_dir_path')
// 	},
// }),

export const getCachePath = createQuery({
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
export const getModsPath = createQuery({
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
export const getDefaultProjectDirPath = createQuery({
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
export const clearGameCache = createMutation({
	mutationFn: async () => {
		await invoke('clear_game_cache')
	},
})

// nukeCache: builder.mutation<void, void>({
// 	query: async () => {
// 		await invoke('nuke_cache')
// 	},
// }),
export const nukeCache = createMutation({
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