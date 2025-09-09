import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { slices } from './reducers'
import { useStore, useSelector, useDispatch } from 'react-redux'

const rootReducer = combineSlices(...slices)
export const store = configureStore({
	reducer: rootReducer,
	middleware: (gdm) => gdm({ immutableCheck: false, serializableCheck: false }),
})

export const dispatch = store.dispatch

export type AppStore = typeof store
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
export type AppAction = Parameters<AppDispatch>[0]

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
export const useAppStore = useStore.withTypes<AppStore>()
