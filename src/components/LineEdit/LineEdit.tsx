import Style from './LineEdit.module.scss'

export function LineEdit(props: React.ComponentProps<'input'> & {

}) {
	const { className, ...htmlProps } = props;
	return <input type="text" className={`${Style.lineEdit} ${className ?? ''}`} {...htmlProps} />
}
