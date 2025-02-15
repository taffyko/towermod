import React from "react"

export function Toggle(props: {
	value?: boolean,
	onChange?: (v: boolean) => void
	children?: React.ReactNode
}) {
	const { value, onChange, children } = props

	return <span style={{ alignSelf: 'center' }}><input style={{ verticalAlign: 'top' }} type="checkbox" checked={value} onChange={e => onChange?.(e.target.checked)} /> {children}</span>
}
