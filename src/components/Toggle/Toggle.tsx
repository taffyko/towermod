import React from "react"

export function Toggle(props: {
	value?: boolean,
	onChange?: (v: boolean) => void
	disabled?: boolean,
	children?: React.ReactNode
}) {
	const { value, onChange, disabled, children } = props

	return <span style={{ alignSelf: 'center' }}><input style={{ verticalAlign: 'top' }} type="checkbox" disabled={disabled} checked={value} onChange={e => onChange?.(e.target.checked)} /> {children}</span>
}
