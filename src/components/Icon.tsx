import clsx from "clsx"
import { useEffect, useState } from "react"

export function Icon(props: {
	src?: string | null,
	/** if true, icon is known to exist and image should not be taken out of flow while loading */
	noReflow?: boolean | null,
	className?: string
}) {
	const { src, className, noReflow } = props
	const [loading, setLoading] = useState(true)
	useEffect(() => {
		setLoading(true)
	}, [src])
	return <>
		<img
			onLoad={() => { if (src) {
				setLoading(false)
			}}}
			className={clsx(
				'object-cover pointer-events-none',
				(!src || loading) ? 'opacity-0' : 'transition-opacity ease-[cubic-bezier(0,0.1,0,1)] duration-250',
				(!src && !noReflow) && 'absolute',
				className,
			)}
			src={src ?? undefined}
		/>
	</>
}
