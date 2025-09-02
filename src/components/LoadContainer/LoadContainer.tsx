import clsx from 'clsx'
import Style from './LoadContainer.module.scss'
import { ErrorMsg } from '@/components/Error'
export function LoadContainer(props: React.ComponentProps<'div'> & {
	isLoading?: boolean
	error?: any,
	children?: React.ReactNode,
	small?: boolean,
	render?: boolean,
}) {
	const { isLoading, error, small, render, children, ...htmlProps } = props
	if (isLoading) {
		return <>
			<SpinnerBox small={small} {...htmlProps} />
			{ render ? <div className="invisible hidden absolute">{children}</div> : null }
		</>
	}
	if (error != null) {
		return <ErrorMsg {...htmlProps} error={error} />
	}
	return <div {...htmlProps}>
		{children}
	</div>
}

function SpinnerBox(props: React.ComponentProps<'div'> & { small?: boolean }) {
	const { small, className, ...htmlProps } = props
	return <div {...htmlProps} className={clsx(Style.spinnerContainer, className)}>
		<div className={small ? Style.spinnerBoxSmall : Style.spinnerBox}>
			<div className={Style.spinnerBg} />
			<div className={Style.spinnerSegment} />
			<div className={Style.outlineInner} />
			<div className={Style.outlineOuter} />
		</div>
	</div>
}
