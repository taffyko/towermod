import { ToastContext, ToastContextState } from "./toastContext";
import Style from './Toast.module.scss';
import { useContext, useMemo, useState } from "react";

function Toast(props: {
	children: React.ReactNode
	idx: number
}) {
	const context = useContext(ToastContext)

	return <div className={Style.toast}>
		{props.children}
		<button onClick={() => context.close(props.idx)}>close me</button>
	</div>
}

export function ToastProvider(props: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<React.ReactNode[]>([])

	const context = useMemo<ToastContextState>(() => ({
		toast(msg) {
			setToasts([...toasts, msg])
		},
		close(i: number) {
			const newToasts = [...toasts]
			newToasts.splice(i, 1)
			setToasts(newToasts)
		}
	}), [setToasts])

	return <ToastContext.Provider value={context}>
		<div className={Style.toastContainer}>
			{toasts.map((msg, i) =>
				<Toast key={i} idx={i}>{msg}</Toast>
			)}
		</div>
		{props.children}
	</ToastContext.Provider>
}
