import { useTwoWayBinding } from "@/util/hooks";
import { filePicker, folderPicker } from "@/util/rpc";
import { FileDialogOptions } from "@towermod";
import { LineEdit } from "./LineEdit";
import { Button } from "./Button";

export default function FilePathEdit(props: Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> & {
	value?: string,
	folder?: boolean,
	onChange?: (value: string) => void,
	options?: FileDialogOptions,
}) {
	const { value: externalValue, onChange, options, folder, ...htmlProps } = props;

	const [value, setValue] = useTwoWayBinding(externalValue, onChange, "");

	return <div className="hbox gap">
		<LineEdit className="grow" {...htmlProps} value={value} onChange={e => setValue(e.target.value)}></LineEdit>
		<Button onClick={async () => {
			let path
			if (folder) {
				path = await folderPicker(options);
			} else {
				path = await filePicker(options);
			}
			if (path != null) { setValue(path) }
		}}>
			Browse
		</Button>
	</div>
}
