import { spin } from '@/app/GlobalSpinner';
import { InvokeArgs, InvokeOptions, invoke } from '@tauri-apps/api/core';
import { FileDialogOptions } from '@towermod';
import { DependencyList, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event'
import { Encoder, Decoder } from '@msgpack/msgpack'

export async function openFolder(dir: string) {
	await invoke('open_folder', { dir })
}

export async function copyFile(src: string, dest: string) {
	await invoke('copy_file', { src, dest })
}

export async function deleteFile(path: string) {
	await invoke('delete_file', { path })
}

export async function waitUntilProcessExits(pid: number) {
	await invoke('wait_until_process_exits', { pid })
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

export async function getVersion(): Promise<string> {
	return await invoke('get_version');
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


const encoder = new Encoder()
const decoder = new Decoder()

/**
 * Invoke, but for binary requests and responses.
 * Arguments tuple is encoded with msgpack, response body decoded with msgpack.
 */
export async function binaryInvoke<T>(cmd: string, args?: unknown[], options?: InvokeOptions): Promise<T> {
	const bytes = await invoke<Uint8Array>(cmd, encoder.encode(args), options)
	return decoder.decode(bytes) as T
}
