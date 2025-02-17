import { MiniEvent, Timer } from "@/util/util";
import React from "react"

export interface ToastOptions {
	type: 'info' | 'error' | 'success' | 'warning',
	time?: number,
}

const DEFAULT_TIME = 1.0;

export function toast(content: React.ReactNode, options?: Partial<ToastOptions>) {
	const id = crypto.randomUUID()
	toasts = [...toasts]
	toasts.push({
		content,
		id,
		timer: new Timer(options?.time ?? DEFAULT_TIME),
		type: options?.type || 'info',
	});
	toastsUpdated.fire(toasts);
}

/** @internal */
export interface ToastData extends ToastOptions {
	content: React.ReactNode,
	id: string,
	timer: Timer,
}

/** @internal */
export let toasts: ToastData[] = [];
/** @internal */
export const toastsUpdated = new MiniEvent(toasts);

/** @internal */
export function closeToast(id: string) {
	const idx = toasts.findIndex(t => t.id === id);
	toasts = [...toasts]
	if (idx === -1) return;
	toasts.splice(idx, 1);
	toastsUpdated.fire(toasts);
}
