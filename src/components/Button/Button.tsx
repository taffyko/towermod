import React from 'react';
import Style from './Button.module.scss'
import Text from '@/components/Text'
import clsx from 'clsx';

export const Button = (props: React.ComponentProps<'button'> & {
	icon?: React.ReactNode
}) => {
	const { className, ref, icon, children, ...htmlProps } = props;
	return <button ref={ref} className={clsx(Style.button, className)} {...htmlProps}>
		{icon}
		{htmlProps.disabled ? props.children : <Text>{children}</Text>}
	</button>
};
