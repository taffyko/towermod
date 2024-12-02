import React from "react";

export interface ModalContextState {
	modalParent: HTMLDivElement,
	setModalParent: React.Ref<HTMLDivElement>,
	modalOpen: boolean,
	setModalOpen(open: boolean),
}

export const ModalContext = React.createContext<ModalContextState | null>(null)
