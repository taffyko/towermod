import { Menu, MenuButton, MenuItem as BaseMenuItem, MenuItems } from '@headlessui/react'
import Style from './DropdownMenu.module.scss'
import clsx from 'clsx'
import React from 'react'
import { useTwoWayBinding } from '@/util'
import { Toggle } from '../Toggle'

export function DropdownMenu(props: { disabled?: boolean, label?: React.ReactNode, children?: React.ReactNode }) {
	const { label, children, disabled } = props
	return <Menu>
		<MenuButton disabled={disabled} className={Style.menuButton}>{label ?? 'Options'}</MenuButton>
		<MenuItems
			onKeyDown={e => {
				if (e.code === 'Space' || e.code === 'Enter') {
					// prevent selecting item with keyborad from closing dropdown when `keepOpen` is set
					e.preventDefault()
					if (e.currentTarget === e.target) {
						const el = e.currentTarget.querySelector('[data-focus]')
						if (el && el instanceof HTMLElement) {
							el.click()
							el.classList.add(Style.pressed)
							e.currentTarget.addEventListener('keyup', () => {
								el.classList.remove(Style.pressed)
							}, { once: true })
						}
					}
				}
			}}
			transition
			anchor="bottom start"
			className={clsx(
				Style.menuItems,
				'origin-top transition duration-200 ease-[cubic-bezier(0,0.1,0,1)] data-[closed]:scale-95 data-[closed]:opacity-0'
			)}
		>
			{children}
		</MenuItems>
	</Menu>
}

export function ToggleMenuItem(props: Omit<React.ComponentProps<typeof MenuItem>, 'value' | 'onChange'> & {
	value?: boolean,
	onChange?: (value: boolean) => void
}) {
	const { value: externalValue, onChange, children, ...rest } = props
	const [value, setValue] = useTwoWayBinding<boolean>(externalValue, onChange, false)

	return <MenuItem keepOpen onClick={() => {
		setValue(!value)
	}} {...rest}>
		<Toggle as="div" value={value}>{children}</Toggle>
	</MenuItem>
}


export function MenuItem(props: React.ComponentProps<'button'> & { keepOpen?: boolean, }) {
	const { className, onClick, keepOpen, disabled, ...rest } = props
	return <BaseMenuItem disabled={disabled}>
		<button
			onClick={(e: any) => {
				if (keepOpen) {
					e?.preventDefault()
				}
				onClick?.(e)
			}}
			onKeyDown={(e: any) => {
				e?.preventDefault()
				e?.stopPropagation()
			}}
			disabled={disabled}
			{...rest}
		/>
	</BaseMenuItem>
}
