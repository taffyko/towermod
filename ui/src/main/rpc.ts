import { dispatch } from './store';
import { actions } from '@shared/reducers';
import * as towermod from '@towermod';

export function hello() {
  console.log("hello");
}

export async function loadModList() {
  const modList = await towermod.listInstalledMods();
  dispatch(actions.setModList(modList))
}
