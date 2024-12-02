import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux'
import type { AppDispatch, AppStore, RootState } from './store'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
export const useAppStore = useStore.withTypes<AppStore>()


function setRef<T>(ref: React.Ref<T> | undefined, value: T) {
	if (!ref) return;
	if (typeof ref === 'function') {
		ref(value);
	} else {
		(ref.current as any) = value
	}
}

export function useForwardRef<T>(inputRef?: React.Ref<T>): React.RefObject<T> {
	const valueHolder = useRef<T>(null!)
	return useMemo(() => {
		return {
			get current() { return valueHolder.current },
			set current(value) {
				setRef(inputRef, value)
				valueHolder.current = value
			},
		}
	}, [inputRef, valueHolder])
}

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


/** Returns the value created by `init` */
export function useImperativeHandle<T, R extends T>(ref: React.Ref<T> | undefined, init: () => R, deps?: React.DependencyList): T {
	const handle = useMemo(init, deps ?? [])
	React.useImperativeHandle(ref, () => handle, [handle])
	return handle
}

/** Semantic replacement for useRef that triggers a re-render when the ref updates */
export function useStateRef<T>() {
	return useState<T | null>(null)
}
