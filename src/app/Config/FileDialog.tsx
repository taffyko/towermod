import { Button } from "@/components/Button";
import { LineEdit } from "@/components/LineEdit";
import { filePicker } from "@/util/rpc";


export function FileDialog(props: Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> & {
	value?: string;
	onChange?: (value: string) => void;
}) {
	const { value: externalValue, onChange, ...htmlProps } = props;

	const [value, setValue] = useTwoWayBinding(externalValue, onChange, "");

	return <div>
		<LineEdit {...htmlProps} value={value} onChange={e => setValue(e.target.value)}></LineEdit>
		<Button onClick={async () => {
			const file = await filePicker();
			if (file != null) { setValue(file); }
		}}>
			Browse
		</Button>
	</div>;
}
