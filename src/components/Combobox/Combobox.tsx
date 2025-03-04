import { Combobox as BaseCombobox, ComboboxInput, ComboboxOptions } from '@headlessui/react';
import { useState } from 'react';

export function Combobox<TValue>(props: {
	value: TValue,
	onChange?: (value: TValue) => void,
	options: React.ReactNode,
	setQuery?: (text: string) => void,
}) {
	const { value, onChange, options, setQuery } = props

	return <BaseCombobox<TValue> value={value} onChange={(v) => {
		if (v != null) {
			onChange?.(v);
		}
	}}>
		<ComboboxInput
			aria-label="ObjectType"
			onChange={(e) => setQuery?.(e.currentTarget.value)}
			placeholder="Search object types..."
		/>
		<ComboboxOptions>
			{options}
		</ComboboxOptions>
	</BaseCombobox>;
}
