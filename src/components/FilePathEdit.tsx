import { useTwoWayBinding } from "@/util/hooks";
import { filePicker } from "@/util/rpc";
import { FileDialogOptions } from "@towermod";
import { LineEdit } from "./LineEdit";
import { Button } from "./Button";

export default function FilePathEdit(props: Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> & {
	value?: string,
	onChange?: (value: string) => void,
	options?: FileDialogOptions,
}) {
	const { value: externalValue, onChange, options, ...htmlProps } = props;

	const [value, setValue] = useTwoWayBinding(externalValue, onChange, "");

	return <div className="hbox gap">
		<LineEdit className="grow" {...htmlProps} value={value} onChange={e => setValue(e.target.value)}></LineEdit>
		<Button onClick={async () => {
			const file = await filePicker(options);
			if (file != null) { setValue(file) }
		}}>
			Browse
		</Button>
	</div>
}
