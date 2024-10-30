import BaseScrollbars from "react-custom-scrollbars-2";
import Style from './Scrollbars.module.scss';
import React from "react";

export const Scrollbars = React.forwardRef<BaseScrollbars, React.ComponentProps<typeof BaseScrollbars>>((props, ref) => {
	return <BaseScrollbars
		renderThumbHorizontal={props => <div {...props} className={Style.thumb} />}
		renderThumbVertical={props => <div {...props} className={Style.thumb} />}
		renderView={props => <div ref={ref} {...props} className={Style.view} />}
		{...props}
	/>
})
