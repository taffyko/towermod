import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux'
import type { AppDispatch, AppStore, RootState } from './store'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
export const useAppStore = useStore.withTypes<AppStore>()

export function useEventListener<K extends keyof WindowEventMap>(el: Window | null, type: K, listener: (this: Window, ev: WindowEventMap[K]) => any, deps?: React.DependencyList, options?: boolean | AddEventListenerOptions): void;
export function useEventListener<K extends keyof DocumentEventMap>(el: Document | null, type: K, listener: (this: Document, ev: DocumentEventMap[K]) => any, deps?: React.DependencyList, options?: boolean | AddEventListenerOptions): void;
export function useEventListener<K extends keyof HTMLElementEventMap, E extends HTMLElement>(el: E | null, type: K, listener: (this: E, ev: HTMLElementEventMap[K]) => any, deps?: React.DependencyList, options?: boolean | AddEventListenerOptions): void;
export function useEventListener(el: any, type: string, listener: EventListener, deps?: React.DependencyList, options?: boolean | AddEventListenerOptions): void;
export function useEventListener(el: any, type: string, listener: EventListener, deps?: React.DependencyList, options?: any) {
	let cb = listener;
	if (deps) {
		// eslint-disable-next-line react-hooks/exhaustive-deps
		cb = useCallback(listener, deps);
	}
	useEffect(() => {
		el?.addEventListener(type, cb, options);
		return () => {
			el?.removeEventListener(type, cb);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [el, cb]);
}
