import Style from './Modal.module.scss'
import { useEventListener } from "@/util/hooks"
import { useModalContext } from "./modalStore"
import IconButton from '@/components/IconButton';
import closeImg from '@/icons/close.svg';

export function BaseModal(props: { children: React.ReactNode, title?: string, onCancel?: () => void }) {
	const { children, onCancel } = props;
	const { active, close, parent } = useModalContext();

	useEventListener(document.body, 'keydown', (e) => {
		if (!active) { return }
		if (e.code === 'Escape') {
			close()
			onCancel?.()
		}
	}, [active])

	// Dismiss when backdrop is clicked
	// useEventListener(parent, 'click', (e) => {
	// 	if (e.target === parent) { close(); onCancel?.() }
	// })

	return <div className={Style.modal}>
		<div className={Style.title}>
			{props.title}
			<IconButton src={closeImg} className={Style.closeButton} onClick={() => { close(); onCancel?.() }} />
		</div>
		<div className={Style.content}>
			{children}
		</div>
	</div>
}
