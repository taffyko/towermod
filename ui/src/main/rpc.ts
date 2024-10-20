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
  // TODO
}
