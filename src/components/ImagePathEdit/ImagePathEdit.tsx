import { filePicker, useIsPressed, useStateRef, useTwoWayBinding } from '@/util'
import Style from './ImagePathEdit.module.scss'
import { useFileUrl } from '@/appUtil'

export default function ImagePathEdit(props: Omit<React.ComponentProps<'img'>, 'onChange'> & {
	value?: string,
	onChange?: (value: string) => void,
}) {
	const { value: externalValue, onChange, className: propsClassName, ...htmlProps } = props

	const [value, setValue] = useTwoWayBinding(externalValue, onChange, "")

	const url = useFileUrl(value)
	const [el, setEl] = useStateRef<HTMLDivElement>()
	const isPressed = useIsPressed(el)

	const className = `${Style.imagePicker} ${propsClassName || ''} ${isPressed ? Style.pressed : ''}`

	return <img {...htmlProps} tabIndex={0} onKeyDown={e => e.code === 'Space' && e.currentTarget.click()} onClick={onClick} ref={setEl} className={className} src={url} />

	async function onClick() {
		const path = await filePicker({
			filters: [
				{ name: 'PNG Image', extensions: ['png'] }
			]
		})
		if (path) { setValue(path) }
	}
}
