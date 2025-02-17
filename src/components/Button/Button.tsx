import Style from './Button.module.scss'
import Text from '@/components/Text'

export function Button(props: {
} & React.ComponentProps<'button'>) {
	const { className, ...htmlProps } = props;
	return <button className={`${Style.button} ${className ?? ''}`} {...htmlProps}>
		{htmlProps.disabled ? props.children : <Text>{props.children}</Text>}
	</button>
}
