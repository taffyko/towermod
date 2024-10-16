import { Dispatch as BaseDispatch, UnknownAction, combineSlices, Observable, Reducer } from "@reduxjs/toolkit";

import { slice } from './slice';

export const rootReducer = combineSlices(slice);

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
