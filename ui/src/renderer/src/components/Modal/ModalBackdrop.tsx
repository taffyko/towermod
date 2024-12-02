import React, { useState } from 'react'
import Style from './Modal.module.scss'

interface ModalContextState {
	modalParent: HTMLElement,
	modalOpen: boolean,
	setModalOpen(open: boolean),
}

export const ModalContext = React.createContext<ModalContextState>(null!)

/** Container for modals */
export function ModalBackdrop() {
	const [modalOpen, setModalOpen] = useState(false)
	const [modalParent, setModalParent] = useState<HTMLDivElement | null>(null)

	return <ModalContext.Provider value={{
		modalParent: modalParent!,
		modalOpen,
		setModalOpen,
	}}>
		<div
			className={`${Style.backdrop} ${modalOpen ? Style.active : ''}`}
			ref={setModalParent}
		/>
	</ModalContext.Provider>
}
