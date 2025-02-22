import { useCallback, useEffect, useState } from 'react'
import Style from './SpinBox.module.scss'
import { useEventListener, useStateRef } from '@/util';

export function SpinBox(props: {
	value?: number,
	int?: boolean,
	onChange?: (v: number) => void
}) {
	const { value: externalValue, int, onChange: externalOnChange } = props

	const [value, setValue] = useState(() => String(externalValue ?? 0))
	const onChange = useCallback((value: string) => {
		setValue(value)
		const processedValue = int ? Math.round(Number(value)) : Number(value)
		externalOnChange?.(processedValue)
	}, [setValue, externalOnChange])

	// update internal value to reflect external value only when control loses focus / on enter
	const [el, setEl] = useStateRef<HTMLInputElement>();
	useEventListener(el, 'blur', (e) => {
		if (externalValue !== undefined) {
			setValue(String(externalValue))
		}
	})
	useEventListener(el, 'keydown', (e) => {
		if (e.code === 'Enter') {
			if (externalValue !== undefined) {
				setValue(String(externalValue))
			}
		}
	})
	useEffect(() => {
		if (externalValue !== undefined) {
			setValue(String(externalValue))
		}
	}, [externalValue])

	return <input
		ref={setEl}
		className={Style.spinbox}
		type="number" step={int ? '1' : 'any'}
		value={value}
		onChange={e => onChange?.(e.target.value)}
	/>
}
