import { createUseStore } from '@shared/reduxtron/zustand-store'
import type { StoreApi, UseBoundStore } from "zustand";
import { State, Action } from '@shared/reducers'

export const useDispatch = () => window.reduxtron.dispatch

const _useStore = createUseStore<State, Action>(window.reduxtron)
export const useStore: UseBoundStore<StoreApi<State>> = _useStore as any;
