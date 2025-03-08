import Svg from "../Svg";
import Style from "./IconButton.module.scss";

export function IconButton(props: {
	src: string,
	big?: boolean,
	flip?: boolean,
} & React.ComponentProps<'button'>) {
	const { src, big, flip, className, ...htmlProps } = props
	return <button
		className={`${Style.iconButton} ${big ? Style.big : ''} ${flip ? Style.flip : ''} ${className ?? ''}`}
		{...htmlProps}
	>
		{ src.endsWith('.svg') || src.startsWith('data:image/svg') ? <Svg href={src} /> : <img src={src} /> }
	</button>
}
