import { BrowserWindow } from 'electron';
import { dispatch, store } from './store';
import { actions } from '@shared/reducers';
import * as towermod from '@towermod';

export function hello() {
  console.log("hello");
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


