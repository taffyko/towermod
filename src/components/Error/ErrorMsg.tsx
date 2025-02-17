import Style from './Error.module.scss'
import { renderError } from "./error";

export function ErrorMsg(props: React.ComponentProps<'div'> & { error: any, inline?: boolean }) {
	const { className, inline, ...htmlProps } = props;
	return <div {...htmlProps} className={`${Style.errorMsg} ${inline ? Style.inline : ''} ${className || ''}`}>
		{renderError(props.error)}
	</div>
}
