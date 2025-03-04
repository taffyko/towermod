import { useCallback, useEffect, useState } from 'react'
import Style from './SpinBox.module.scss'
import { useEventListener, useStateRef, useOptimisticTwoWayBinding, classes } from '@/util';

export function SpinBox(props: Omit<React.ComponentProps<'input'>, 'onChange' | 'value'> & {
	value?: number,
	int?: boolean,
	small?: boolean,
	onChange?: (v: number) => void
}) {
	const { value: externalValue, int, onChange: externalOnChange, small, className, ...htmlProps } = props

	const [el, setEl] = useStateRef<HTMLInputElement>();
	const [value, setValue] = useOptimisticTwoWayBinding({
		externalValue, el, isInputField: true, initialValue: '0', transform: v => String(v)
	})
	const onChange = useCallback((value: string) => {
		setValue(value)
		const processedValue = int ? parseInt(value) : parseFloat(value)
		if (isNaN(processedValue)) { return }
		externalOnChange?.(processedValue)
	}, [setValue, externalOnChange])

	return <input
		ref={setEl}
		{...classes(Style.spinbox, small && Style.small, className)}
		type="number" step={int ? '1' : 'any'}
		value={value}
		onChange={e => onChange?.(e.target.value)}
		{...htmlProps}
	/>
}
