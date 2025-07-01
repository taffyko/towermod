import clsx from 'clsx'
import Style from './LineEdit.module.scss'
import { useSize, useStateRef } from '@/util'
import Text from '@/components/Text'

export function LineEdit(props: React.ComponentProps<'input'> & {
	children?: React.ReactNode
}) {
	const { className, children, disabled, placeholder, value, ...htmlProps } = props
	const [el, setEl] = useStateRef<HTMLDivElement>()
	const size = useSize(el)

	return <div
		className={clsx(Style.lineEdit, disabled && Style.disabled, className)}
		style={{ ['--internal-children-width' as any]: `${size ? (size.left + size.right) : 0}px` }}
	>
		<span className={clsx(Style.placeholder, !!value && 'hidden')}>{placeholder}</span>
		<Text>
			<input value={value} disabled={disabled} spellCheck={false} type="text" {...htmlProps} />
		</Text>
		<div ref={setEl} className={clsx(Style.internalChildren, !children && 'hidden')}><Text>{children}</Text></div>
	</div>
}
