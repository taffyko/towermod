export function Text(props: React.ComponentProps<'span'> & {
	children: React.ReactNode
	className?: string,
}) {
	const { className, children, ...htmlProps } = props;
	return <span {...htmlProps} className={`text ${className || ''}`}>{children}</span>
}

export default Text
