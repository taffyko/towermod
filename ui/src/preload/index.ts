import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { preloadReduxBridge } from '@shared/reduxtron/preload';
import remote from '@electron/remote';

const { handlers } = preloadReduxBridge(ipcRenderer)

// Custom APIs for renderer
const api = {}

const rpc = remote.require('./rpc');

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('reduxtron', handlers)
    contextBridge.exposeInMainWorld('rpc', rpc)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.reduxtron = handlers
  // @ts-ignore (define in dts)
  window.remote = remote
}
