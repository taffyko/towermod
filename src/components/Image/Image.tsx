import { useStateRef } from "@/util"
import clsx from "clsx"
import { useEffect, useEffectEvent, useState } from "react"
import Style from './Image.module.scss'

export function Image(props: {
	src?: string | null,
	/** if true, icon is known to exist and image should not be taken out of flow while loading */
	noReflow?: boolean | null,
	className?: string
} & React.ComponentProps<'img'>) {
	const { src, className, noReflow, ...htmlProps } = props
	const [el, setEl] = useStateRef<HTMLImageElement>()
	const [loading, setLoading] = useState(true)


	useEffect(() => {
		if (el) {
			el.src = src || ''
			setLoading(el.complete)
		}
	}, [src, el])

	return <>
		<img
			ref={setEl}
			onLoad={() => {
				if (src) { setLoading(false) }
			}}
			className={clsx(
				'object-cover pointer-events-none',
				(!src || loading) ? 'opacity-0' : 'transition-opacity ease-[cubic-bezier(0,0.1,0,1)] duration-250',
				(!src && !noReflow) && 'absolute',
				className || 'h-[100%] aspect-square',
			)}
			src={src ?? undefined}
			{...htmlProps}
		/>
	</>
}

export function ImageButton(props: React.ComponentProps<'button'> & { src: string | undefined }) {
	const { className, src, ...rest } = props
	return <button className={clsx(Style.imageButton, className, !src && 'opacity-0')} {...rest}>
		<Image
			noReflow={true}
			src={src}
		>
		</Image>
	</button>
}
