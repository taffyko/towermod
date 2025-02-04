import React, { DependencyList, EffectCallback, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux'
import type { AppDispatch, AppStore, RootState } from './store'
import { MiniEvent, assert } from './util';

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
export function useEventListener(el: any, type: string, listener: EventListener, deps?: React.DependencyList, options?: boolean | AddEventListenerOptions) {
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

/** Allows you to return both a value and a cleanup function that runs before the value recomputes */
export function useMemoWithCleanup<T>(factory: () => [T] | [T, ReturnType<EffectCallback>], deps: DependencyList): T {
	const ref = useRef<void | (() => void)>();
	return useMemo(() => {
		if (ref.current) {
			ref.current()
		}
		const [value, cleanup] = factory()
		ref.current = cleanup
		return value
	}, deps)
}

/** Semantic replacement for useRef that triggers a re-render when the ref updates */
export function useStateRef<T>() {
	return useState<T | null>(null)
}


export function useMiniEvent<T>(event: MiniEvent<T>, cb: (e: T) => void, deps: React.DependencyList) {
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const fn = useCallback(cb, deps);
	useEffect(() => {
		event.subscribe(fn);
		return () => event.unsubscribe(fn);
	}, [event, fn]);
}

export function useRerender() {
	const [, setState] = useState({});
	const rerender = useMemo(() => () => setState({}), [setState]);
	return rerender;
}

export function useIsHovered(el: HTMLElement | null) {
	const [hovered, setHovered] = useState(false);
	useEventListener(el, 'mouseenter', () => {
		setHovered(true);
	})
	useEventListener(el, 'mouseleave', () => {
		setHovered(false);
	})
	return hovered
}

export function useIsFocused(el: HTMLElement) {
	const [focused, setFocused] = useState(false);
	useEventListener(el, 'focus', () => {
		setFocused(true);
	})
	useEventListener(el, 'blur', (e) => {
		assert(e.currentTarget instanceof Node)
		if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) {
			return
		}
		setFocused(false)
	})
	return focused
}
