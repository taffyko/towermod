import { spin } from '@/app/GlobalSpinner';
import { invoke } from '@tauri-apps/api/core';
import { FileDialogOptions, ModInfo } from '@towermod';
import { DependencyList, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event'
import { win32 as path } from 'path';
import { toast } from '@/app/Toast';
import { api } from '@/api';

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
	const modsDirPath = await getModsDirPath()
	for (const file of files) {
		const fileName = path.basename(file);
		await copyFile(file, path.join(modsDirPath, fileName));
	}
	files.length > 1 ? toast(`Installed ${files.length} mods`) : toast(`Installed "${path.basename(files[0])}"`)
	dispatch(api.util.invalidateTags(['ModInfo']))
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
	'towermod/mod-installed': ModInfo
	'towermod/progress': string,
	'towermod/toast': string,
}

export function useTauriEvent<T extends keyof EventTypeMap>(type: T, handler: EventCallback<EventTypeMap[T]>, deps: DependencyList = []): void {
	useEffect(() => {
		const unlisten = listen(type, handler)
		return () => { unlisten.then(fn => fn()) };
	}, [type, ...deps])
}
