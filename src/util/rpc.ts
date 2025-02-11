import { spin } from '@/app/GlobalSpinner';
import { invoke } from '@tauri-apps/api/core';
import { FileDialogOptions } from '@towermod';

export async function openFolder(dir: string) {
	await invoke('open_folder', { dir })
}

export async function filePicker(options?: FileDialogOptions): Promise<string | null> {
	return await spin(invoke<string | null>("file_picker", { options }));
}

export async function folderPicker(options?: FileDialogOptions): Promise<string | null> {
	return await spin(invoke<string | null>("folder_picker", { options }));
}

export async function getModsDirPath(): Promise<string> {
	return await invoke('get_mods_dir_path')
}
