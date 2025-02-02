import { combineSlices, configureStore } from '@reduxjs/toolkit';
import { slices } from '@shared/reducers';
import { api } from './api';

const rootReducer = combineSlices(...slices, api)
export const store = configureStore({
	reducer: rootReducer,
	middleware: (gdm) => gdm({ serializableCheck: false }).concat(api.middleware),
})

export const dispatch = store.dispatch;

export type AppStore = typeof store
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
export type AppAction = Parameters<AppDispatch>[0]
