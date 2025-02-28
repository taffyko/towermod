import { api } from '@/api';
import Style from './Svg.module.scss';

export function Svg(props: {
	href: string
} & React.ComponentProps<'img'>) {
	const { href, ...htmlProps } = props;
	const { data: url } = api.useGetPixelatedSvgQuery(href)
	if (!url) { return null }
	return <img src={url} className={Style.svg} {...htmlProps} />
}
