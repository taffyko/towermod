import React, { useContext, useState } from 'react'
import Style from './Modal.module.scss'
import { ModalContext } from './modalContext'


export function ModalContextProvider(props: { children: React.ReactNode }) {
	const [modalOpen, setModalOpen] = useState(false)
	const [modalParent, setModalParent] = useState<HTMLDivElement | null>(null)

	return <ModalContext.Provider value={{
		modalParent: modalParent!,
		setModalParent,
		modalOpen,
		setModalOpen,
	}}>
		{props.children}
	</ModalContext.Provider>
}

/**
 * Container for modals
 * Exactly one ModalParent must exist within a given ModalContext.
 */
export function ModalParent() {
	const context = useContext(ModalContext);
	if (!context) { return null }

	return <div
		className={`${Style.backdrop} ${context.modalOpen ? Style.active : ''}`}
		ref={context.setModalParent}
	/>
}
