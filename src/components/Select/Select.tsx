import Style from './Select.module.scss'

export function Select(props: Omit<React.ComponentProps<'div'>, 'onChange'> & {
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
