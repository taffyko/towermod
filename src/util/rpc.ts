import { spin } from '@/app/GlobalSpinner';
import { invoke } from '@tauri-apps/api/core';
import { FileDialogOptions } from '@towermod';
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

export function useTauriEvent(type: 'drag-enter', handler: EventCallback<TauriDragPayload>, deps?: DependencyList): void
export function useTauriEvent(type: 'drag-drop', handler: EventCallback<TauriDragPayload>, deps?: DependencyList): void
export function useTauriEvent(type: 'drag-leave', handler: EventCallback<null>, deps?: DependencyList): void
export function useTauriEvent(type: 'drag-over', handler: EventCallback<TauriPositionPayload>, deps?: DependencyList): void
export function useTauriEvent(type: string, handler: (e: any) => void, deps: DependencyList = []): void {
	useEffect(() => {
		const unlisten = listen(`tauri://${type}`, handler)
		return () => { unlisten.then(fn => fn()) };
	}, [type, ...deps])
}
