import clsx from 'clsx';
import Style from './LineEdit.module.scss'
import { useSize, useStateRef } from '@/util';

export function LineEdit(props: React.ComponentProps<'input'> & {
	children?: React.ReactNode
}) {
	const { className, children, ...htmlProps } = props;
	const [el, setEl] = useStateRef<HTMLDivElement>()
	const size = useSize(el)

	return <div
		className={clsx(Style.lineEdit, className)}
		style={{ ['--internal-children-width' as any]: `${size ? (size.left + size.right) : 0}px` }}
	>
		<input spellCheck={false} type="text" {...htmlProps} />
		<div ref={setEl} className={clsx(Style.internalChildren, !children && 'hidden')}>{children}</div>
	</div>
}
