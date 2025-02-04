import Style from './Toast.module.scss';
import { useEffect, useState } from "react";
import { ToastData, closeToast, toasts, toastsUpdated } from './toastStore';
import IconButton from "../IconButton";
import closeSvg from '@/icons/close.svg';
import { useIsHovered, useMiniEvent, useRerender, useStateRef } from '@/hooks';

function Toast(props: ToastData) {
	const { content, id, timer } = props;
	const [timerProgress, setTimerProgress] = useState(timer.progress);
	const [el, setEl] = useStateRef<HTMLDivElement>();
	const hovered = useIsHovered(el);

	useEffect(() => {
		hovered ? timer.stop() : timer.update();
	}, [hovered, timer])

	useMiniEvent(timer.progressEvent, (progress) => {
		setTimerProgress(progress)
	}, [setTimerProgress]);

	useMiniEvent(timer.timeoutEvent, () => {
		closeToast(id)
	}, [closeToast, id]);

	const opacity = hovered ? 1 : 1 - timerProgress;

	return <div
		ref={setEl}
		className={Style.toast}
		style={{ ['--timer-opacity' as any]: opacity }}
	>
		<IconButton src={closeSvg} onClick={() => closeToast(id)} />
		{content}
	</div>
}

export function ToastContainer() {
	const rerender = useRerender();

	useMiniEvent(toastsUpdated, () => {
		rerender()
	}, [rerender]);

	return <div className={Style.toastContainer}>
		{toasts.map((toastData) =>
			<Toast
				key={toastData.id}
				{...toastData}
			/>
		)}
	</div>
}
