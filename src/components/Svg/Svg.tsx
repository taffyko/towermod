import { useMemo } from "react"
import { api } from '@/api';
import Style from './Svg.module.scss';

function svgToDataUri(svg: string | SVGElement) {
	const xml = typeof svg === 'string' ? svg : (new XMLSerializer).serializeToString(svg);
	return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(xml);
}

export function Svg(props: {
	href: string
} & React.ComponentProps<'img'>) {
	const { href, ...htmlProps } = props;
	const { data } = api.useGetTextQuery(href);

	const url = useMemo(() => {
		if (!data) { return null }
		const svgDoc = (new DOMParser).parseFromString(data, 'image/svg+xml');
		const svg = svgDoc.querySelector('svg')
		if (!svg) {
			console.error("SVG not found in loaded content");
			return null
		}
		svg.setAttribute('shape-rendering', 'crispEdges');
		return svgToDataUri(svg);
	}, [data])

	if (!url) { return null }


	return <img src={url} className={Style.svg} {...htmlProps} />
}
