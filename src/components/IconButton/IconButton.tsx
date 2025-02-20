import Svg from "../Svg";
import Style from "./IconButton.module.scss";

export function IconButton(props: {
	src: string,
	big?: boolean,
	label?: React.ReactNode,
} & React.ComponentProps<'button'>) {
	const { src, big, className, label, ...htmlProps } = props
	return <button
		className={`${Style.iconButton} ${big ? Style.big : ''} ${className ?? ''}`}
		{...htmlProps}
	>
		{ src.endsWith('.svg') ? <Svg href={src} /> : <img src={src} /> }
		&nbsp;{label}
	</button>
}
