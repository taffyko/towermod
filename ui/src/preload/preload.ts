import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { preload } from 'electron-redux/preload'
import remote from '@electron/remote';

preload()

// Custom APIs for renderer
const api = {}
const towermodRpcModule = remote.require('./rpc');

// @ts-ignore
window.electron = electronAPI
// @ts-ignore
window.api = api
// @ts-ignore
window.towermodRpcModule = towermodRpcModule
