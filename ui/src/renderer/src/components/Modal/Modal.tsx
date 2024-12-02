import { useContext, useEffect } from 'react'
import Style from './Modal.module.scss'
import { ModalContext } from '.'
import { createPortal } from 'react-dom'
import { useEventListener } from '@renderer/hooks'

export function Modal(props: {
	children: React.ReactNode,
	requestClose: () => void,
}) {
	const { children, requestClose } = props
	const modalContext = useContext(ModalContext)

	useEffect(() => {
		modalContext?.setModalOpen(true)
		return () => {
			modalContext?.setModalOpen(false)
		}
	}, [modalContext])

	useEventListener(document.body, 'keydown', (e) => {
		if (e.code === 'Escape') {
			requestClose()
		}
	})

	useEventListener(modalContext?.modalParent, 'click', (e) => {
		if (e.target === modalContext?.modalParent){
			requestClose()
		}
	})

	const content = <div className={Style.modal}>
		<button className={Style.closeButton} onClick={requestClose}>x</button>
		{children}
	</div>

	if (!modalContext?.modalParent) {
		return null
	}

	return createPortal(content, modalContext.modalParent)

}
