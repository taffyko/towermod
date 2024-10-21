import { createUseStore } from '@shared/reduxtron/zustand-store'
import type { StoreApi, UseBoundStore } from "zustand";
import { State, Action } from '@shared/reducers'
import { useCallback, useEffect } from 'react';

export const useDispatch = () => window.reduxtron.dispatch

const _useStore = createUseStore<State, Action>(window.reduxtron)
export const useStore: UseBoundStore<StoreApi<State>> = _useStore as any;

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
