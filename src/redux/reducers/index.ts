import { Dispatch as BaseDispatch, UnknownAction, Observable, combineSlices, Reducer } from "@reduxjs/toolkit";

import { appSlice } from './app';
import { dataSlice } from './data';

export const slices = [appSlice, dataSlice] as const

export const actions = {
	...appSlice.actions,
	...dataSlice.actions,
}

export const rootReducer = combineSlices(appSlice, dataSlice)
export type Action = UnknownAction
export type State = ReturnType<typeof rootReducer>
export type Dispatch = BaseDispatch<Action>
export type Subscribe = (listener: () => void) => () => void

export type Store = {
	getState: () => State
	dispatch: Dispatch
	subscribe: Subscribe
	replaceReducer: (nextReducer: Reducer<State, Action>) => void
	[Symbol.observable](): Observable<State>
}

type MiddlewareStore = Pick<Store, 'getState' | 'dispatch'>

export type Middleware<A extends UnknownAction = Action> = (
	store: MiddlewareStore,
) => (next: Dispatch) => (action: A) => Promise<Action>
