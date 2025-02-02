import { useContext, useEffect, useMemo, useState } from 'react'
import Style from './Modal.module.scss'
import { ModalContext, ModalContextState } from '.'
import { useEventListener } from '@renderer/hooks'
import { Portal } from '@/components/Portal'
import IconButton from '../IconButton'
import close from '@/icons/close.svg';

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
		<IconButton src={close} className={Style.closeButton} onClick={requestClose} />
		{children}
	</div>

	return <Portal parent={modalContext?.modalParent}>
		{content}
	</Portal>
}

export function ModalContextProvider(props: {
	children: React.ReactNode | ((context: ModalContextState) => React.ReactNode)
}) {
	const [isModalOpen, setModalOpen] = useState(false)
	const [modalParent, setModalParent] = useState<HTMLDivElement | null>(null)
	const [ActiveModal, setModal] = useState<React.ElementType<{ requestClose: () => void }> | null>(null)

	const context = useMemo<ModalContextState>(() => ({
		modalParent: modalParent!,
		isModalOpen: isModalOpen,
		openModal: setModal,
		setModalOpen,
	}), [modalParent, isModalOpen, setModal, setModalOpen])

	return <ModalContext.Provider value={context}>
		{ActiveModal ?
			<ActiveModal requestClose={() => setModal(null)} />
		: ActiveModal}
		<div
			className={`${Style.backdrop} ${isModalOpen ? Style.active : ''}`}
			ref={setModalParent}
		/>
		{typeof props.children === 'function' ? props.children(context) : props.children}
	</ModalContext.Provider>
}

export function ModalContextContainer(props: React.ComponentProps<'div'> & { children: React.ReactNode }) {
	const { children, ...htmlProps } = props;
	return <ModalContextProvider>
		{({isModalOpen}) =>
			<div
				{...htmlProps}
				// @ts-ignore
				inert={isModalOpen ? "" : undefined}
			>
				{children}
			</div>
		}
	</ModalContextProvider>
}
