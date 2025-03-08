import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import Style from './Select.module.scss'
import Svg from '../Svg';
import downImg from '@/icons/arrowDown.svg'
import rightImg from '@/icons/arrowRight.svg'
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import checkboxOnImg from '@/images/checkboxOn.png'
import checkboxOffImg from '@/images/checkboxOff.png'
import { triggerTransition, useStateRef, useTwoWayBinding } from '@/util';

export function Select2(props: Omit<React.ComponentProps<'div'>, 'onChange'> & {
	options: Record<string, string> | string[],
	onChange?: (value: string) => void,
	value?: string,
	disabled?: boolean,
}) {
	const { options, onChange, value, className, disabled, ...htmlProps } = props;
	return <select {...(htmlProps as any)}
		disabled={disabled}
		className={`${Style.select} ${className || ''}`}
		value={value} onChange={e => onChange?.(e.target.value)}
	>
		{
			options instanceof Array
				? options.map(value => <option key={value} value={value}>{value}</option>)
				: Object.entries(options).map(([value, label]) => <option key={value} value={value}>{label}</option>)
		}
	</select>
}

type Choice = { name: string } | string
interface BaseSelectProps {
	multiple?: boolean,
	options: Choice[],
	label?: string,
	disabled?: boolean,
}
export interface MultiSelectProps extends BaseSelectProps {
	multiple: true,
	value?: Choice[],
	onChange?: (value: Choice[]) => void,
}
export interface SelectProps extends BaseSelectProps {
	multiple?: false,
	value?: Choice | null,
	onChange?: (value: Choice) => void,
}

export function Select<T extends SelectProps | MultiSelectProps>(props: T) {
	const { options, multiple, value: externalValue, onChange: externalOnChange, label } = props
	const disabled = !!props.disabled || options.length === 0

	const [value, setValue] = useTwoWayBinding<any>(externalValue, externalOnChange, multiple ? [] : null)

	let buttonContent: React.ReactNode = label
	if (!label) {
		if (multiple) {
			buttonContent = <span>{(value as Choice[]).length} selected</span>
		} else {
			if (value) {
				buttonContent = <span>{typeof (value as Choice) === 'string' ? value : value.name}</span>
			} else {
				buttonContent = <span className="text-(--color-text-subtle)">No selection</span>
			}
		}
	}

	const [el, setEl] = useStateRef<HTMLButtonElement>()

	return (
		<Listbox disabled={disabled} value={value} onChange={(v) => {
			triggerTransition(el, Style.transitionSelected)
			setValue(v)
		}} multiple={multiple}>
			<ListboxButton
				ref={setEl}
				className={clsx(
					'relative block rounded-(--border-radius) border-1 bg-(--color-bg) py-0 pr-8 pl-3 text-left text-sm/6 text-white',
					'focus:outline-none border-[1px-[red] data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25',
					'not-data-disabled:hover:bg-(--color-bg-active) h-[24px] group text-ellipsis whitespace-nowrap overflow-hidden w-(--button-width)',
					'data-disabled:border-[1px-[red]] data-disabled:text-(--color-text-disabled) data-disabled:cursor-not-allowed',
					Style.listboxButton,
				)}
			>
				{buttonContent}
				{!disabled ? <>
					<Svg href={rightImg} aria-hidden="true"
						className="group-data-open:hidden pointer-events-none absolute top-0.5 right-2.5 size-4"
					/>
					<Svg href={downImg} aria-hidden="true"
						className="group-not-data-open:hidden pointer-events-none absolute top-0.5 right-2.5 size-4"
					/>
				</> : null}
			</ListboxButton>
			<ListboxOptions
				anchor="bottom"
				transition
				className={clsx(
					'w-(--button-width) rounded-xl border-1 bg-(--color-bg) p-1 [--anchor-gap:var(--spacing)] focus:outline-none',
					'data-leave:data-[closed]:opacity-0 transition ease-out'
				)}
			>
				{options.map((option) => {
					const name = typeof option === 'string' ? option : option.name
					return <ListboxOption
						key={name}
						value={option}
						className={"group flex cursor-default items-center gap-2 rounded-lg py-0 px-0 select-none data-[focus]:bg-white/10"}
					>
						{({ selected }) => <>
							{ multiple ? <img src={selected ? checkboxOnImg : checkboxOffImg} className="pl-1" /> : null }
							<div className={clsx("text-sm/6 text-white overflow-hidden text-ellipsis", !multiple && "px-1")}>{name}</div>
						</>}
					</ListboxOption>
				})}
			</ListboxOptions>
		</Listbox>
	)
}
