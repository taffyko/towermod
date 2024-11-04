import { BrowserWindow, contentTracing } from 'electron';
import { dispatch, store } from './store';
import { actions } from '@shared/reducers';
import * as towermod from '@towermod';

export async function startTracing() {
	console.log("Starting trace...")
	await contentTracing.startRecording({
		included_categories: [
			'*',
			'disabled-by-default-v8.cpu_profiler',
			'disabled-by-default-v8.cpu_profiler.hires',
		],
		excluded_categories: [],
	})
	console.log("Trace started")
}

export async function stopTracing() {
	console.log("Stopping trace...")
	const outFile = `${__dirname}/trace.json`
	await contentTracing.stopRecording(outFile)
	console.log(`Trace saved to ${outFile}`)
}


export async function initialize() {
	await towermod.init()
}

export async function loadModList() {
	const modList = await towermod.listInstalledMods();
	dispatch(actions.setModList(modList))
}

export async function setGamePath(path: string) {
	const game = await towermod.gameFromPath(path);
	dispatch(actions.setActiveGame(game))
}

export async function playMod(filePath: string) {
	const state = store.getState();
	if (!state.main.game) { throw new Error("Game not set"); }
	towermod.playMod(filePath, state.main.game)
}

export async function newProject() {
	// const { main } = store.getState()
	// if (!main.game) { throw new Error("Game not set"); }

	console.time('rust.gameFromPath')
	const game = await towermod.gameFromPath("C:\\Program Files (x86)\\Steam\\steamapps\\common\\TowerClimb\\TowerClimb_V1_Steam4.exe");
	console.timeEnd('rust.gameFromPath')
	console.time('rust.newProject')
	const data = await towermod.newProject(game);
	console.timeEnd('rust.newProject')

	console.time('dispatchMain')
	dispatch(actions.setData(data))
	console.timeEnd('dispatchMain')
}

export async function playProject() {
	// TODO
}

export async function playVanilla() {
	const state = store.getState()
	const gamePath = state.main.game?.filePath
	if (!gamePath) { throw new Error("Game not set") }
	await towermod.runGame(gamePath)
}


export async function winMinimize() {
	BrowserWindow.getFocusedWindow()?.minimize();
}

export async function winMaximize() {
	const window = BrowserWindow.getFocusedWindow();
	if (window) {
		if (!window.isMaximized()) {
			window.maximize()
		} else {
			window.unmaximize()
		}
	}
}

export async function winClose() {
	BrowserWindow.getFocusedWindow()?.close();
}


