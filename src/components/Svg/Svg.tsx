import { api } from '@/api';
import Style from './Svg.module.scss';
import clsx from 'clsx';

export function Svg(props: {
	href: string
} & React.ComponentProps<'img'>) {
	const { href, className, ...htmlProps } = props;
	const { data: url } = api.useGetPixelatedSvgQuery(href)
	if (!url) { return <div className={className} {...htmlProps} /> }
	return <img src={url} className={clsx(Style.svg, className)} {...htmlProps} />
}
