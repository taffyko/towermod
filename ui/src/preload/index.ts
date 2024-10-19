import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { preloadReduxBridge } from '@shared/reduxtron/preload';
import remote from '@electron/remote';

const { handlers } = preloadReduxBridge(ipcRenderer)

// Custom APIs for renderer
const api = {}

const towermodRpcModule = remote.require('./rpc');

try {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
  contextBridge.exposeInMainWorld('reduxtron', handlers)
  contextBridge.exposeInMainWorld('towermodRpcModule', towermodRpcModule)
} catch (error) {
  console.error(error)
}
