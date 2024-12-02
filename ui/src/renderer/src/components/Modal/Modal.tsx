import Style from './Modal.module.scss'

export function Modal(props: {
	children: React.ReactNode
}) {
	const { children } = props

	return <div className={Style.modal}>
		{children}
	</div>
}
