import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { preload } from 'electron-redux/preload'
import remote from '@electron/remote';

preload()

// Custom APIs for renderer
const api = {}

const towermodRpcModule = remote.require('./rpc');

try {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
  contextBridge.exposeInMainWorld('towermodRpcModule', towermodRpcModule)
} catch (error) {
  console.error(error)
}
