import Style from './Toast.module.scss'
import { useEffect } from "react"
import { ToastData, closeToast, toastsUpdated } from './toastStore'
import IconButton from "@/components/IconButton"
import closeSvg from '@/icons/close.svg'
import { useIsHovered, useMiniEvent, useMiniEventValue, useStateRef } from '@/util/hooks'
import Text from '@/components/Text'

function Toast(props: ToastData & { idx: number }) {
	const { content, id, idx, timer, type } = props
	const timerProgress = useMiniEventValue(timer.progressEvent)
	const [el, setEl] = useStateRef<HTMLDivElement>()
	const hovered = useIsHovered(el)

	// Synchronize timer state with whether toast is active/hovered
	useEffect(() => {
		if (idx > 0 || hovered) {
			timer.stop()
			timer.reset()
		} else {
			timer.start()
		}
	}, [hovered, timer, idx])

	useMiniEvent(timer.timeoutEvent, () => {
		closeToast(id)
	})

	return <div
		ref={setEl}
		className={`
			${Style.toast}
			${type === 'warning' ? Style.warning : ''}
			${type === 'error' ? Style.error : ''}
		`}
		style={{ ['--time-left' as any]: 1 - timerProgress }}
	>
		<IconButton src={closeSvg} className={Style.closeButton} onClick={() => closeToast(id)} />
		<div className={Style.toastStripe}></div>
		<Text>{content}</Text>
	</div>
}

export function ToastContainer() {
	const toasts = useMiniEventValue(toastsUpdated)

	return <div
		className={Style.toastContainer}
	>
		{toasts?.map((toastData, idx) =>
			<Toast
				key={toastData.id}
				idx={idx}
				{...toastData}
			/>
		)}
	</div>
}
