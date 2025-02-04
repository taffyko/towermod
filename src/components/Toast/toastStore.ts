import { MiniEvent, Timer } from "@/shared/util";
import React from "react"

export interface ToastOptions {
	type: 'info' | 'error' | 'success' | 'warning',
}

export function toast(content: React.ReactNode, options?: ToastOptions) {
	const id = crypto.randomUUID()
	toasts.push({
		content,
		id,
		timer: new Timer(1.0),
		type: options?.type || 'info',
	});
	toastsUpdated.fire();
}

/** @internal */
export interface ToastData extends ToastOptions {
	content: React.ReactNode,
	id: string,
	timer: Timer,
}

/** @internal */
export const toasts: ToastData[] = [];
/** @internal */
export const toastsUpdated = new MiniEvent();

/** @internal */
export function closeToast(id: string) {
	const idx = toasts.findIndex(t => t.id === id);
	if (idx === -1) return;
	toasts.splice(idx, 1);
	toastsUpdated.fire();
}
