export function SpinBox(props: {
	value: number,
	onChange?: (v: number) => void
}) {
	const { value, onChange } = props

	return <input type="number" value={value} onChange={e => onChange?.(Number(e.target.value))} />
}
