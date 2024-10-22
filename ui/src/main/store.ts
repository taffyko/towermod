import { Tuple, configureStore } from '@reduxjs/toolkit';
import { rootReducer } from '@shared/reducers';
import {
  defaultOptions as serifyDefaultOptions,
  createReduxMiddleware as createSerifyMiddleware
} from '@karmaniverous/serify-deserify';
const serifyMiddleware = createSerifyMiddleware(serifyDefaultOptions);

export const store = configureStore({
  reducer: rootReducer,
  middleware: (_getDefaultMiddleware) => new Tuple(serifyMiddleware),
})

export const dispatch = store.dispatch;

export type AppStore = typeof store
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
export type AppAction = Parameters<AppDispatch>[0]
