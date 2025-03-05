import { Combobox as BaseCombobox, ComboboxInput, ComboboxOptions, ComboboxOption } from '@headlessui/react';
import Style from './Combobox.module.scss'
import { classes, triggerTransition, useStateRef } from '@/util';
import { useState } from 'react';
import IconButton from '../IconButton';
import editImg from '@/icons/edit.svg'
import { Button } from '../Button';

export function Combobox<TValue extends { name: string }>(props: {
	value?: TValue,
	options: TValue[],
	onChange?: (value: TValue) => void,
	setQuery?: (text: string) => void,
	/** allow value to be cleared by completely backspacing the input field */
	allowClear?: boolean,
	inputProps?: Partial<React.ComponentProps<typeof ComboboxInput>>
	query?: string,
}) {
	const { value, onChange, options, query, setQuery, allowClear, inputProps } = props

	const [el, setEl] = useStateRef<HTMLInputElement>()
	return <BaseCombobox
		value={value}
		onChange={(v) => {
			if (v === value) { return }
			if (!v && !allowClear) { return }
			triggerTransition(el, Style.transitionSubmitted)
			onChange?.(v)
		}}
		virtual={{
			options,
		}}
	>
		<ComboboxInput
			value={query}
			ref={setEl}
			className={Style.comboboxInput}
			onChange={(e) => setQuery?.(e.currentTarget.value)}
			displayValue={(v: TValue) => v?.name ?? ""}
			{...inputProps}
		/>
		<ComboboxOptions anchor="bottom" className={Style.comboboxOptions}>
			{({ option }) => (
				<ComboboxOption value={option} className="data-[focus]:bg-blue-100">
					{option.name}
				</ComboboxOption>
			)}
		</ComboboxOptions>
	</BaseCombobox>
}

export function ComboboxButton<TValue extends { name: string }>(props: {
	value: TValue | undefined,
	options: TValue[],
	onChange?: (value: TValue) => void,
	query?: string,
	setQuery?: (text: string) => void,
	onClick?: () => void,
}) {
	const { value, options, onChange, query, setQuery, onClick } = props
	const [editing, setEditing] = useState(false)

	const [el, setEl] = useStateRef<HTMLDivElement>()

	return <div ref={setEl} className={Style.comboboxButton} style={{ width: '178px' }}>
		{editing ?
			<Combobox value={value} options={options}
				query={query}
				setQuery={setQuery}
				onChange={(v) => {
					setEditing(false);
					triggerTransition(el, Style.transitionSubmitted)
					onChange?.(v)
				}}
				inputProps={{
					onBlur: () => { setEditing(false) },
					onKeyDown: (e: any) => { if (e.key === 'Enter' || e.key === 'Escape') { setEditing(false) } },
					autoFocus: true,
				}}
			/>
		:
			<Button onClick={onClick}>{value?.name ?? 'No value'}</Button>
		}
		{!editing ?
			<IconButton src={editImg} onClick={() => { setQuery?.(""); setEditing(true) }} />
		: null}
	</div>
}
