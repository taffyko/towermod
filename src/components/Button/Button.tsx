import Style from './Button.module.scss'

export function Button(props: {
} & React.ComponentProps<'button'>) {
	const { className, ...htmlProps } = props;
	return <button className={`${Style.button} ${className ?? ''}`} {...htmlProps}>
		{props.children}
	</button>
}
