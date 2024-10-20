import { configureStore } from '@reduxjs/toolkit';

import { rootReducer } from '@shared/reducers';

export const store = configureStore({
  reducer: rootReducer,
})

export const dispatch = store.dispatch;

export type AppStore = typeof store
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
export type AppAction = Parameters<AppDispatch>[0]
