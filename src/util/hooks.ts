/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/rules-of-hooks */
import React, { DependencyList, EffectCallback, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { MiniEvent, assert, createObjectUrl, revokeObjectUrl } from './util'
import { useIsSpinning } from '@/app/GlobalSpinner'
import { useIsModalOpen } from '@/app/Modal/modalStore'
import useResizeObserver from '@react-hook/resize-observer'

function setRef<T>(ref: React.Ref<T> | undefined, value: T) {
	if (!ref) return
	if (typeof ref === 'function') {
		ref(value)
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

export function useEventListener<K extends keyof WindowEventMap>(el: Window | null | undefined, type: K, listener: (this: Window, ev: WindowEventMap[K]) => any, deps?: React.DependencyList, options?: boolean | AddEventListenerOptions): void
export function useEventListener<K extends keyof DocumentEventMap>(el: Document | null | undefined, type: K, listener: (this: Document, ev: DocumentEventMap[K]) => any, deps?: React.DependencyList, options?: boolean | AddEventListenerOptions): void
export function useEventListener<K extends keyof HTMLElementEventMap, E extends HTMLElement>(el: E | null | undefined, type: K, listener: (this: E, ev: HTMLElementEventMap[K]) => any, deps?: React.DependencyList, options?: boolean | AddEventListenerOptions): void
export function useEventListener(el: any, type: string, listener: EventListener, deps?: React.DependencyList, options?: boolean | AddEventListenerOptions) {
	let cb = listener
	if (deps) {
		cb = useCallback(listener, deps)
	}
	useEffect(() => {
		el?.addEventListener(type, cb, options)
		return () => {
			el?.removeEventListener(type, cb, options)
		}

	}, [el, cb])
}


/** Returns the value created by `init` */
export function useImperativeHandle<T, R extends T>(ref: React.Ref<T> | undefined, init: () => R, deps?: React.DependencyList): T {
	const handle = useMemo(init, deps ?? [])
	React.useImperativeHandle(ref, () => handle, [handle])
	return handle
}

/** Won't trigger re-renders in child components that depend on it */
export function useStableHandle<T extends object>(value: T): T {
	const ref = useRef<T>({} as any)
	Object.assign(ref.current, value)
	return ref.current
}

export function useMemoAsync<T>(fn: () => Promise<T> | T, deps?: DependencyList): T | undefined {
	const [result, setResult] = useState<T | undefined>(undefined)
	useEffect(() => {
		(async () => {
			const result = await fn()
			setResult(result)
		})()
	}, deps)
	return result
}

export function useMemoAsyncWithCleanup<T>(factory: () => [Promise<T> | undefined] | [Promise<T> | undefined, () => void], deps: DependencyList): T | undefined {
	const resultRef = useRef<null | [Promise<T> | undefined] | [Promise<T> | undefined, ReturnType<EffectCallback>]>(null)
	const [result, setResult] = useState<T | undefined>(undefined)
	const rerender = useRerender()

	// recompute value
	if (!resultRef.current) {
		resultRef.current = factory()
	}

	useEffect(() => {
		if (!resultRef.current) { return }
		const [promise, ] = resultRef.current
		void (async () => {
			const result = await promise
			// only use result if the promise hasn't been invalidated
			if (promise === resultRef.current?.[0]) {
				setResult(result)
			}
		})()
		return () => {
			if (resultRef.current) {
				const [, cleanup] = resultRef.current
				if (cleanup) {
					setTimeout(() => cleanup(), 0)
				}
				// invalidate value to trigger recompute on next render
				resultRef.current = null
				setResult(undefined)
				rerender()
			}
		}
	}, deps)
	return result
}

/** Allows you to return both a value and a cleanup function that runs before the value recomputes */
export function useMemoWithCleanup<T>(factory: () => [T] | [T, ReturnType<EffectCallback>], deps: DependencyList): T {
	const resultRef = useRef<null | [T] | [T, ReturnType<EffectCallback>]>(null)
	const rerender = useRerender()
	// recompute value
	if (!resultRef.current) {
		resultRef.current = factory()
	}

	useEffect(() => {
		return () => {
			if (resultRef.current) {
				const [, cleanup] = resultRef.current
				if (cleanup) {
					// queue cleanup in next task
					// (to give the chance for a subsequent render to propagate the new value first)
					setTimeout(() => cleanup(), 0)
				}
				// invalidate value to trigger recompute on next render
				resultRef.current = null
				rerender()
			}
		}
	}, deps)

	const [value, ] = resultRef.current
	return value
}

/** Semantic replacement for useRef that triggers a re-render when the ref updates */
export function useStateRef<T>() {
	return useState<T | null>(null)
}

/**
 * Run only once on mount, and run cleanup only once on unmount - even during development
 * (for edge-cases where StrictMode considerations can be safely disregarded)
 */
export function useMountEffect(effect: React.EffectCallback): void {
	if (import.meta.env.PROD) {
		useEffect(effect, [])
	} else {
		const strictModeMount = useRef(false)
		useEffect(() => {
			if (!strictModeMount.current) {
				strictModeMount.current = true
				return
			}
			return effect()
		}, [])
	}
}

export function useMiniEvent<T>(event: MiniEvent<T> | null | undefined, cb: (e: T) => void, deps: React.DependencyList) {

	const fn = useCallback(cb, deps)
	useEffect(() => {
		event?.subscribe(fn)
		return () => event?.unsubscribe(fn)
	}, [event, fn])
}

export function useMiniEventValue<T>(event: MiniEvent<T>): T
export function useMiniEventValue(event: undefined): undefined
export function useMiniEventValue<T>(event?: MiniEvent<T>): T | undefined {
	const subscribe = useCallback(event?.subscribe.bind(event) ?? (() => () => {}), [event])
	return useSyncExternalStore(subscribe, () => event?.lastValue as T)
}

export function useRerender() {
	const [, setState] = useState({})
	const rerender = useMemo(() => () => setState({}), [setState])
	return rerender
}

export function useIsHovered(el: HTMLElement | null) {
	const [hovered, setHovered] = useState(false)
	useEventListener(el, 'mouseenter', () => {
		setHovered(true)
	})
	useEventListener(el, 'mouseleave', () => {
		setHovered(false)
	})
	return hovered
}

export function useIsFocused(el: HTMLElement | null) {
	const [focused, setFocused] = useState(false)
	useEventListener(el, 'focus', () => {
		setFocused(true)
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

export function useIsPressed(el: HTMLElement | null) {
	const [pressed, setPressed] = useState(false)
	useEffect(() => {
		setPressed(false)
	}, [el])
	useEventListener(el, 'mousedown', () => {
		setPressed(true)
	})
	useEventListener(el, 'mouseup', () => {
		setPressed(false)
	})
	useEventListener(window, 'mouseup', () => {
		setPressed(false)
	})
	return pressed
}

/**
 * NOTE: Prefer using a custom RTK Query endpoint to create object URLs for performance reasons
 * (sharing already-created URLs, delayed eviction, etc.)
 */
export function useObjectUrl(data?: BlobPart | number[] | null, options?: BlobPropertyBag): string | undefined
export function useObjectUrl(blob?: Blob | null): string | undefined
export function useObjectUrl(data?: Blob | BlobPart | number[] | null, options?: BlobPropertyBag): string | undefined {
	const href = useMemoWithCleanup(() => {
		// convert to Blob if raw data given
		let blob: Blob | undefined
		if (data instanceof Blob) {
			blob = data
		} else if (data) {
			let binary
			if (data instanceof Array) { binary = new Uint8Array(data) }
			else { binary = data }
			blob = new Blob([binary], options)
		}

		if (blob) {
			const href = createObjectUrl(blob)
			return [href, () => revokeObjectUrl(href)]
		} else {
			return [undefined]
		}
	}, [data, options?.type])
	return href
}

/** `useState` wrapper that mimics how native React components handle two-way binding with `value` and `onChange` */
export function useTwoWayBinding<T>(externalValue: T | undefined, onChange: ((value: T) => void) | undefined, initialValue: T): [T, (value: T) => void]
export function useTwoWayBinding<T>(externalValue: T, onChange?: (value: T) => void, initialValue?: T): [T, (value: T) => void]
export function useTwoWayBinding<T>(externalValue?: T, onChange?: (value: T) => void, initialValue?: T): any {
	const [internalValue, _setInternalValue] = useState(externalValue ?? initialValue as T)

	// For consistency with React's native `<input>` components,
	// only value changes that originate internally should trigger the `onChange` handler.
	const setInternalValue = useCallback((value: T) => {
		// If no external value is being used, update the internal value
		if (externalValue === undefined) { _setInternalValue(value) }
		onChange?.(value)
	}, [externalValue, onChange])

	useEffect(() => {
		// If an external value is provided, update the internal value.
		if (externalValue !== undefined) { _setInternalValue(externalValue) }
	}, [externalValue])

	return [internalValue, setInternalValue]
}

/**
 * `useTwoWayBinding` variant that allows its value to be edited internally, only propagating changes to the external value when `submit` is called.
 */
export function useTwoWaySubmitBinding<T>(externalValue?: T, onSubmit?: (value: T) => void, initialValue?: T): [T, (value: T) => void, boolean, (value?: T) => void] {
	const [internalValue, _setInternalValue] = useState(externalValue ?? initialValue as T)
	const [dirty, setDirty] = useState(false)
	const [resetToExternalValue, setResetToExternalValue] = useState(false)

	const setInternalValue = useCallback((value: T) => {
		if (externalValue !== undefined && value !== externalValue) { setDirty(true) }
		_setInternalValue(value)
	}, [setDirty, _setInternalValue, externalValue])


	useEffect(() => {
		// If an external value is provided, update the internal value.
		if (externalValue !== undefined) { _setInternalValue(externalValue) }
		setResetToExternalValue(false)
		setDirty(false)
	}, [setDirty, _setInternalValue, externalValue, resetToExternalValue])

	const submit = useCallback((customNewValue?: T) => {
		let newValue = internalValue
		if (customNewValue !== undefined) {
			newValue = customNewValue
			_setInternalValue(newValue)
		}
		newValue !== undefined && onSubmit?.(newValue)
		setResetToExternalValue(true)
	}, [internalValue, onSubmit])

	return [internalValue, setInternalValue, dirty, submit]
}

export function useOptimisticTwoWayBinding<T, TInternal = T>(options: {
	initialValue?: TInternal,
	externalValue?: T
	/** transform external value */
	transform?: (v: T) => TInternal,
	el?: HTMLElement | null,
	/** don't allow an updated external value to clobber the current internal value while the element is focused */
	ignoreWhileEditing?: boolean,
	isInputField?: boolean,
}) {
	const { externalValue, el, isInputField, ignoreWhileEditing, initialValue } = options
	const transform = options.transform ?? (v => v as any)
	const [value, setValue] = useState<TInternal>(() => externalValue !== undefined ? transform(externalValue) : initialValue)
	// update internal value to reflect external value when control loses focus
	useEventListener(el, 'blur', (e) => {
		if (externalValue !== undefined && !(e.relatedTarget instanceof Node && el?.contains(e.relatedTarget))) {
			setValue(transform(externalValue))
		}
	})
	useEventListener(el, 'keydown', (e) => {
		if (isInputField && e.code === 'Enter') {
			if (externalValue !== undefined) {
				setValue(transform(externalValue))
			}
		}
	})
	useEffect(() => {
		if (externalValue !== undefined) {
			if (ignoreWhileEditing !== false && el) {
				// do not overwrite the internal value while the element is focused
				if (!el?.contains(document.activeElement)) {
					setValue(transform(externalValue))
				}
			} else {
				setValue(transform(externalValue))
			}
		}
	}, [externalValue])
	return [value, setValue] as const
}

export function useIsInert() {
	const isSpinning = useIsSpinning()
	const isModalOpen = useIsModalOpen()
	return isSpinning || isModalOpen
}

export function useSize(target?: HTMLElement | null) {
	const [size, setSize] = React.useState<DOMRect>()

	React.useLayoutEffect(() => {
		if (target) {
			setSize(target.getBoundingClientRect())
		}
	}, [target])

	useResizeObserver(target ?? { current: null }, (entry) => setSize(entry.contentRect))
	return size
}

