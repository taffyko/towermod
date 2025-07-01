import Style from './GlobalSpinner.module.scss'
import { useIsSpinning, useShouldShowSpinner } from './globalSpinner'

export function GlobalSpinner() {
	const spinning = useIsSpinning()
	const shouldShowSpinner = useShouldShowSpinner()
	return <div className={`${Style.spinnerBackdrop} ${spinning ? Style.active : ''}`}>
		{shouldShowSpinner ?
			<div className={Style.spinnerBox}>
				<div className={Style.spinnerBg} />
				<div className={Style.spinnerSegment} />
				<div className={Style.outlineInner} />
				<div className={Style.outlineOuter} />
			</div>
			: null}
	</div>
}
