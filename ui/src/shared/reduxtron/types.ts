import type { IpcMain, IpcRenderer, WebContents } from "electron";
import type { Store, UnknownAction } from "redux";

export type MainReduxBridge = {
  <S extends Store>(ipcMain: IpcMain, webContents: WebContents, store: S): { unsubscribe: () => void };
};

export type AnyState = Record<string, unknown>;

export type PreloadReduxBridgeReturn<
  S extends AnyState,
  A extends UnknownAction
> = {
  handlers: {
    dispatch: (action: A) => void;
    getState: () => Promise<Partial<S>>;
    subscribe: (callback: (newState: S) => void) => () => void;
  };
};

export type PreloadReduxBridge = {
  <S extends AnyState, A extends UnknownAction>(
    ipcRenderer: IpcRenderer
  ): PreloadReduxBridgeReturn<S, A>;
};
