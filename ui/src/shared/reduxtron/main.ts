import type { MainReduxBridge } from "./types";

// utility to plug redux functions onto main ipc
// this adds the subscribe and dispatch messages
export const mainReduxBridge: MainReduxBridge = (ipcMain, webContents, store) => {
  ipcMain.handle("getState", () => store.getState());
  ipcMain.on(
    "dispatch",
    (_: unknown, action: Parameters<typeof store.dispatch>[0]) =>
      store.dispatch(action),
  );
  const unsubscribe: () => void = store.subscribe(() => {
    // TODO: move selector implementation to the main process
    // instead of serializing & transferring the *whole store* per-hook per-update :<
    webContents.send("subscribe", store.getState())
  });
  return { unsubscribe };
};
