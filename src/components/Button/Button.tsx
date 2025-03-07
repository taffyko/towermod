import React from 'react';
import Style from './Button.module.scss'
import Text from '@/components/Text'
import clsx from 'clsx';

export const Button = React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>((props, ref) => {
	const { className, ...htmlProps } = props;

	return <button ref={ref} className={clsx(Style.button, className)} {...htmlProps}>
		{htmlProps.disabled ? props.children : <Text>{props.children}</Text>}
	</button>
});
