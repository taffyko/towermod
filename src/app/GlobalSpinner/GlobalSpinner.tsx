import Style from './GlobalSpinner.module.scss'
import { useIsSpinning } from './globalSpinner'

export function GlobalSpinner() {
	const spinning = useIsSpinning();
	return <div className={`${Style.spinnerBackdrop} ${spinning ? Style.active : ''}`}>
		<div className={Style.spinnerBox}>
			<div className={Style.spinnerBg} />
			<div className={Style.spinnerSegment} />
			<div className={Style.outlineInner} />
			<div className={Style.outlineOuter} />
		</div>
	</div>
}
