import Style from './SpinBox.module.scss'

export function SpinBox(props: {
	value?: number,
	int?: boolean,
	onChange?: (v: number) => void
}) {
	const { value, int, onChange } = props

	return <input className={Style.spinbox} type="number" value={value} onChange={e => onChange?.(int ? Math.round(Number(e.target.value)) : Number(e.target.value))} />
}
