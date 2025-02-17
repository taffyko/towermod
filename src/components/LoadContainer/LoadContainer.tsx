import Style from './LoadContainer.module.scss'
import { ErrorMsg } from '@/components/Error';
export function LoadContainer(props: React.ComponentProps<'div'> & {
	isLoading?: boolean
	error?: any,
	children?: React.ReactNode,
}) {
	const { isLoading, error, children, ...htmlProps } = props;
	if (isLoading) {
		return <SpinnerBox {...htmlProps} />
	}
	if (error !== undefined) {
		return <ErrorMsg {...htmlProps} error={error} />
	}
	return <div {...htmlProps}>
		{children}
	</div>
}

function SpinnerBox(props: React.ComponentProps<'div'>) {
	const { className, ...htmlProps } = props;
	return <div {...htmlProps} className={`${Style.spinnerContainer} ${className || ''}`}>
		<div className={Style.spinnerBox}>
			<div className={Style.spinnerBg} />
			<div className={Style.spinnerSegment} />
			<div className={Style.outlineInner} />
			<div className={Style.outlineOuter} />
		</div>
	</div>
}
