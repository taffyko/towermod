import { ElectronAPI } from '@electron-toolkit/preload'
import { UnknownAction } from '@reduxjs/toolkit'

type RpcModule = typeof import('../main/rpc');

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    towermodRpcModule: RpcModule
  }
}
