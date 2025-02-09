import Style from './Select.module.scss'

export function Select(props: React.ComponentProps<'div'> & {
	options: Record<string, string> | string[],
	onChange?: (value: string) => void,
	value?: string,
}) {
	const { options, onChange, value, className, ...htmlProps } = props;
	return <select {...(htmlProps as any)}
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
