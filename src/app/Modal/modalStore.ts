import { useMiniEventValue } from "@/util/hooks";
import { MiniEvent } from "@/util/util";
import React, { useMemo } from "react"

export function openModal(content: React.ReactNode) {
	const id = crypto.randomUUID()
	modals.push({
		content,
		id,
	});
	modalsUpdated.fire(modals);
}

export function closeModal(id: string) {
	const idx = modals.findIndex(t => t.id === id);
	if (idx === -1) return;
	modals.splice(idx, 1);
	modalsUpdated.fire(modals);
}

export function useModalContext() {
	const modals = useMiniEventValue(modalsUpdated);
	const { id, parent } = React.useContext(thisModalContext);
	const activeModalId = modals[modals.length - 1]?.id;
	if (!id) { throw new Error("Called useModalContext outside of a modal") };
	return useMemo(() => ({
		id,
		parent,
		close: () => closeModal(id),
		active: id === activeModalId,
	}), [id, activeModalId, parent])
}

export const thisModalContext = React.createContext<{
	id: string | null
	parent: HTMLDivElement | null,
}>({ id: null, parent: null });

/** @internal */
export interface ModalData {
	content: React.ReactNode,
	id: string,
}

/** @internal */
export const modals: ModalData[] = [];
/** @internal */
export const modalsUpdated = new MiniEvent(modals);
