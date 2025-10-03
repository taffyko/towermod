import { useMiniEventValue } from "@/util/hooks"
import { MiniEvent } from "@/util/util"
import React, { useMemo } from "react"

/** API to open modals imperatively in async/await UI event logic. */
export function openModal(content: React.ReactNode) {
	const id = crypto.randomUUID()
	modals = [...modals]
	modals.push({
		content,
		id,
	})
	modalsUpdated.fire(modals)

	// resolve when modal is closed
	return new Promise<void>((resolve) => {
		modalsUpdated.subscribe(onModalsUpdated)
		function onModalsUpdated(modals: ModalData[]) {
			if (!modals.find(m => m.id === id)) {
				modalsUpdated.unsubscribe(onModalsUpdated)
				resolve()
			}
		}
	})
}
type OnConfirmArg<T> = T extends { onConfirm?: (arg: infer U) => void } ? U : never
export function openConfirmModal<P extends {}>(component: React.ComponentType<P>, props: NoInfer<Omit<P, 'onConfirm'>>): Promise<OnConfirmArg<P> | undefined> {
	return new Promise<OnConfirmArg<P> | undefined>((resolve) => {
		const node = React.createElement(component, { ...props, onConfirm: resolve } as any)
		openModal(node).then(() => resolve(undefined))
	})
}

export function closeModal(id: string) {
	const idx = modals.findIndex(t => t.id === id)
	if (idx === -1) return
	modals = [...modals]
	modals.splice(idx, 1)
	modalsUpdated.fire(modals)
}

export function useModalContext() {
	const modals = useMiniEventValue(modalsUpdated)
	const { id, parent } = React.useContext(thisModalContext)
	const activeModalId = modals[modals.length - 1]?.id
	if (!id) { throw new Error("Called useModalContext outside of a modal") };
	return useMemo(() => ({
		id,
		parent,
		close: () => closeModal(id),
		active: id === activeModalId,
	}), [id, activeModalId, parent])
}

export function useIsModalOpen() {
	const modals = useMiniEventValue(modalsUpdated)
	return !!modals.length
}

export const thisModalContext = React.createContext<{
	id: string | null
	parent: HTMLDivElement | null,
}>({ id: null, parent: null })

/** @internal */
export interface ModalData {
	content: React.ReactNode,
	id: string,
}

/** @internal */
export let modals: ModalData[] = []
/** @internal */
export const modalsUpdated = new MiniEvent(modals)
