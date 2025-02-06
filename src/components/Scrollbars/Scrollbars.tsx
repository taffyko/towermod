import BaseScrollbars from "react-custom-scrollbars-2";
import Style from './Scrollbars.module.scss';
import React, { useCallback, useEffect, useImperativeHandle, useState } from "react";

type Props = React.ComponentProps<typeof BaseScrollbars> & {
	viewRef?: React.LegacyRef<HTMLDivElement>
}

export const Scrollbars = React.forwardRef<BaseScrollbars | null, Props>((inputProps, ref) => {
	let {viewRef: _viewRef, ...restProps} = inputProps
	const viewRef = (_viewRef ?? null) as React.Ref<HTMLDivElement | null>;

	const [innerViewRef, setInnerViewRef] = useState<HTMLDivElement | null>(null)
	const [innerRef, setInnerRef] = useState<BaseScrollbars | null>(null)

	useImperativeHandle(viewRef, () => innerViewRef)
	useImperativeHandle(ref, () => innerRef!)

  const refSetter = useCallback((newInnerRef: BaseScrollbars | null) => {
		setInnerRef(newInnerRef)
		setInnerViewRef(newInnerRef?.container?.children[0] as HTMLDivElement || null)
  }, []);

	useEffect(() => {
		innerViewRef?.parentElement?.classList.add(Style.viewParent)
	}, [innerViewRef])

	return <BaseScrollbars
		ref={refSetter}
		renderThumbHorizontal={props => <div {...props} className={Style.thumb} />}
		renderThumbVertical={props => <div {...props} className={Style.thumb} />}
		renderView={props => <div {...props} className={Style.view} />}
		{...restProps}
	/>
})
