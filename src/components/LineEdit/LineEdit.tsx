import Style from './LineEdit.module.scss'

export function LineEdit(props: React.ComponentProps<'input'> & {

}) {
	const { className, ...htmlProps } = props;
	return <input spellCheck={false} type="text" className={`${Style.lineEdit} ${className ?? ''}`} {...htmlProps} />
}
