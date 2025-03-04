import React from "react"
import checkboxOnImg from '@/images/checkboxOn.png'
import checkboxOffImg from '@/images/checkboxOff.png'
import { useTwoWayBinding } from "@/util"
import IconButton from "../IconButton"
import Style from './Toggle.module.scss'

export function Toggle(props: {
	value?: boolean,
	onChange?: (v: boolean) => void
	disabled?: boolean,
	children?: React.ReactNode
}) {
	const { value: externalValue, onChange, disabled, children } = props

	const [checked, setChecked] = useTwoWayBinding(externalValue, onChange, false)

	const src = checked ? checkboxOnImg : checkboxOffImg

	return <button
		disabled={disabled}
		onClick={() => setChecked(!checked)}
		className={`${Style.toggle}`}
	>
		<img src={src} />
		{children}
	</button>
}
