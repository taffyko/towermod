import React from "react"
import checkboxOnImg from '@/images/checkboxOn.png'
import checkboxOffImg from '@/images/checkboxOff.png'
import { useTwoWayBinding } from "@/util"
import Style from './Toggle.module.scss'
import clsx from "clsx"
import Text from '@/components/Text'

export function Toggle(props: {
	as?: 'div' | 'span' | 'button',
	value?: boolean,
	onChange?: (v: boolean) => void
	disabled?: boolean,
	children?: React.ReactNode
}) {
	const { value: externalValue, onChange, disabled, children, as } = props
	const Element = as || 'button'

	const [checked, setChecked] = useTwoWayBinding(externalValue, onChange, false)

	const src = checked ? checkboxOnImg : checkboxOffImg

	return <Element
		disabled={disabled}
		onClick={() => setChecked(!checked)}
		className={clsx(Style.toggle, checked && Style.checked)}
	>
		<img src={src} />
		<Text>{children}</Text>
	</Element>
}
