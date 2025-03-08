import { Combobox as BaseCombobox, ComboboxInput, ComboboxOptions, ComboboxOption } from '@headlessui/react';
import Style from './Combobox.module.scss'
import { triggerTransition, useStateRef } from '@/util';
import { useState } from 'react';
import IconButton from '../IconButton';
import editImg from '@/icons/edit.svg'
import clsx from 'clsx';
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
	placeholder?: string
	disabled?: boolean,
}) {
	const { value, onChange, options, query, setQuery, allowClear, inputProps, placeholder, disabled } = props

	const [el, setEl] = useStateRef<HTMLInputElement>()
	return <BaseCombobox
		disabled={disabled}
		value={value}
		onChange={(v) => {
			if (v === value) { return }
			if (!v && !allowClear) { return }
			triggerTransition(el, Style.transitionSubmitted)
			setQuery?.(v?.name || "")
			onChange?.(v)
		}}
		virtual={{
			options,
		}}
	>
		<ComboboxInput
			disabled={disabled}
			ref={setEl}
			className={Style.comboboxInput}
			onChange={(e) => setQuery?.(e.currentTarget.value)}
			displayValue={(v: TValue) => v?.name ?? ""}
			//@ts-ignore
			placeholder={placeholder ?? "Enter value..."}
			{...inputProps}
		/>
		<ComboboxOptions anchor="bottom" className={Style.comboboxOptions}>
			{({ option }) => (
				<ComboboxOption value={option}>
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
	placeholder?: string,
	disableButton?: boolean,
	disableEditing?: boolean,
}) {
	const { value, options, onChange, query, setQuery, onClick, placeholder, disableButton, disableEditing } = props
	const [editing, setEditing] = useState(false)

	const [el, setEl] = useStateRef<HTMLDivElement>()

	return <div ref={setEl} className={clsx(Style.comboboxButton, "w-[178px]")}>
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
				placeholder={placeholder}
				disabled={disableEditing}
			/>
		:
			<Button disabled={disableButton || !value?.name} onClick={onClick}>{value?.name ?? placeholder ?? 'Enter value...'}</Button>
		}
		{!editing ?
			<IconButton disabled={disableEditing} src={editImg} onClick={() => { setQuery?.(""); setEditing(true) }} />
		: null}
	</div>
}
