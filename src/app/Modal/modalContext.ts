import React, { useContext } from "react";

export interface ModalContextState {
	modalParent: HTMLDivElement,
	isModalOpen: boolean,
	setModalOpen(open: boolean): void,
	/** Fire-and-forget modal */
	openModal: (component: React.ElementType<{ requestClose: () => void }>) => void
}

export const ModalContext = React.createContext<ModalContextState | null>(null)

export function useModalContext() {
	return useContext(ModalContext)
}
