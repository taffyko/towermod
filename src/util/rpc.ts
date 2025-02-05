import { invoke } from '@tauri-apps/api/core';

export async function openFolder(dir: string) {
	await invoke('open_folder', { dir })
}

export async function filePicker(): Promise<string | null> {
	return await invoke("file_picker");
}

export async function getModsDirPath(): Promise<string> {
	return await invoke('get_mods_dir_path')
}

