import { actions } from '@/reducers';
import { dispatch } from '../store';
import { api } from '../api';
import { invoke } from "@tauri-apps/api/core";
import { ModInfo } from '@towermod';
import { toast } from '@/app/Toast';

export async function initialize() {
	await invoke("init");
	await api.endpoints.setGame.initiate("D:\\SteamLibrary\\steamapps\\common\\TowerClimb\\TowerClimb_V1_Steam4.exe")
	toast("Game path set");
}
