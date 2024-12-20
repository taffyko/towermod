import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from '@shared/reducers';
import { stateSyncEnhancer } from 'electron-redux/main';

export const store = configureStore({
	reducer: rootReducer,
	enhancers: (getDefaultEnhancers) => getDefaultEnhancers().concat(stateSyncEnhancer()),
	middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
})

export const dispatch = store.dispatch;

export type AppStore = typeof store
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
export type AppAction = Parameters<AppDispatch>[0]
