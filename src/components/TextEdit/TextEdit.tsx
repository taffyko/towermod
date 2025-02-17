import Style from './TextEdit.module.scss'

export function TextEdit(props: React.ComponentProps<'textarea'> & {

}) {
	const { className, ...htmlProps } = props;
	return <textarea spellCheck={false} className={`${Style.textEdit} ${className ?? ''}`} {...htmlProps} />
}
