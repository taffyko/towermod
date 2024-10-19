import { ElectronAPI } from '@electron-toolkit/preload'
import { UnknownAction } from '@reduxjs/toolkit'
import type { PreloadReduxBridgeReturn } from '@reduxtron'

type RpcModule = typeof import('../main/rpc');

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    reduxtron: PreloadReduxBridgeReturn<AppState, UnknownAction>
    towermodRpcModule: RpcModule
  }
}
