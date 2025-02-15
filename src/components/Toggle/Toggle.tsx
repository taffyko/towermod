export function Toggle(props: {
	value: boolean,
	onChange?: (v: boolean) => void
}) {
	const { value, onChange } = props

	return <input type="checkbox" checked={value} onChange={e => onChange?.(e.target.checked)} />
}
