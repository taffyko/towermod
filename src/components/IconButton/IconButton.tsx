import Svg from "../Svg";
import Style from "./IconButton.module.scss";

export function IconButton(props: {
	src: string,
	big?: boolean,
} & React.ComponentProps<'button'>) {
	const { src, big, className, ...htmlProps } = props
	return <button
		className={`${Style.iconButton} ${big ? Style.big : ''} ${className ?? ''}`}
		{...htmlProps}
	>
		{ src.endsWith('.svg') ? <Svg href={src} /> : <img src={src} /> }
	</button>
}
