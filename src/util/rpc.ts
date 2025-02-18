import { spin } from '@/app/GlobalSpinner';
import { invoke } from '@tauri-apps/api/core';
import { FileDialogOptions, ModInfo } from '@towermod';
import { DependencyList, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event'
import { toast } from '@/app/Toast';
import { api } from '@/api';
import { throwOnError } from '@/components/Error';
import { AppContextState, appContextStore } from '@/app/App/appContext';
import { uniqueVersionName } from './dataUtil';

export async function openFolder(dir: string) {
	await invoke('open_folder', { dir })
}

export async function copyFile(src: string, dest: string) {
	await invoke('copy_file', { src, dest })
}

export async function deleteFile(path: string) {
	await invoke('delete_file', { path })
}

export async function installMods(files: string[]) {
	const { dispatch } = await import('@/store');
	const appContext = appContextStore.lastValue;
	console.log("installMods", appContext.mods)
	for (const file of files) {
		const { data: modInfo } = await throwOnError(spin(dispatch(api.endpoints.installMod.initiate(file))))
		if (modInfo) {
			toast(`Installed mod: "${modInfo.name}" (v${modInfo.version})`);
			appContext?.tabs?.setCurrentTab('Mods')
			appContext?.mods?.showMod(uniqueVersionName(modInfo))
		}
	}
}

export async function filePicker(options?: FileDialogOptions): Promise<string | null> {
	return await spin(invoke<string | null>("file_picker", { options }), true);
}

export async function folderPicker(options?: FileDialogOptions): Promise<string | null> {
	return await spin(invoke<string | null>("folder_picker", { options }), true);
}

export async function getModsDirPath(): Promise<string> {
	return await invoke('get_mods_dir_path')
}


interface TauriPositionPayload {
	position: {
		x: number,
		y: number
	}
}
interface TauriDragPayload extends TauriPositionPayload {
	paths: string[]
}

type EventCallback<T> = Parameters<typeof listen<T>>[1]

interface EventTypeMap {
	'tauri://drag-enter': TauriDragPayload
	'tauri://drag-drop': TauriDragPayload
	'tauri://drag-leave': null
	'tauri://drag-over': TauriPositionPayload
	'towermod/error': unknown
	'towermod/request-install-mod': string,
	'towermod/progress': string,
	'towermod/toast': string,
}

export function useTauriEvent<T extends keyof EventTypeMap>(type: T, handler: EventCallback<EventTypeMap[T]>, deps: DependencyList = []): void {
	useEffect(() => {
		const unlisten = listen(type, handler)
		return () => { unlisten.then(fn => fn()) };
	}, deps ? [type, ...deps] : undefined)
}
