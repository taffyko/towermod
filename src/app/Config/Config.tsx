import { api } from "@/api";
import { useCallback, useEffect, useState } from "react";
import { toast } from "@/app/Toast";
import { Button } from "@/components/Button";
import { LineEdit } from "@/components/LineEdit";
import Text from "@/components/Text";
import { filePicker } from "@/util/rpc";
import { ConfirmModal } from "../Modal";
import { openModal } from "@/app/Modal";


/** `useState` wrapper that mimics how native React components handle two-way binding with `value` and `onChange` */
function useTwoWayBinding<T>(externalValue: T | undefined, onChange: ((value: T) => void) | undefined, initialValue: T): [T, (value: T) => void]
function useTwoWayBinding<T>(externalValue: T, onChange?: (value: T) => void, initialValue?: T): [T, (value: T) => void]
function useTwoWayBinding<T>(externalValue?: T, onChange?: (value: T) => void, initialValue?: T): any {
	const [internalValue, _setInternalValue] = useState(externalValue ?? initialValue as T);

	// For consistency with React's native `<input>` components,
	// only value changes that originate internally should trigger the `onChange` handler.
	const setInternalValue = useCallback((value: T) => {
		// If no external value is being used, update the internal value
		if (externalValue === undefined) { _setInternalValue(value) }
		onChange?.(value);
	}, [externalValue, onChange])

	useEffect(() => {
		// If an external value is provided, update the internal value.
		if (externalValue !== undefined) { _setInternalValue(externalValue) }
	}, [externalValue])

	return [internalValue, setInternalValue]
}

export function FileDialog(props: Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> & {
	value?: string,
	onChange?: (value: string) => void,
}) {
	const { value: externalValue, onChange, ...htmlProps } = props;

	const [value, setValue] = useTwoWayBinding(externalValue, onChange, "");

	return <div>
		<LineEdit {...htmlProps} value={value} onChange={e => setValue(e.target.value)}></LineEdit>
		<Button onClick={async () => {
			const file = await filePicker();
			if (file != null) { setValue(file) }
		}}>
			Browse
		</Button>
	</div>
}

function SetGameModal(props: {
	initialValue: string,
}) {
	const { initialValue } = props;
	const [setGame] = api.useSetGameMutation()
	const [gamePath, setGamePath] = useState(initialValue)
	return <ConfirmModal onConfirm={() => {
		setGame(gamePath)
	}} confirmText="Set path">
		Any unsaved project changes will be lost.
		<FileDialog value={gamePath} onChange={setGamePath} />
	</ConfirmModal>
}

export const Config = () => {
	const { data: game } = api.useGetGameQuery()
	const [newProject] = api.useNewProjectMutation()
	const { data: config } = api.useGetConfigQuery();

	const [gamePath, setGamePath] = useState(game?.filePath || "")
	useEffect(() => {
		if (game?.filePath) { setGamePath(game.filePath) }
	}, [game])

	return <div className="vbox gap">
		<div className="hbox">
			{game ? <Text>Valid game selected</Text> : <Text>Please set a valid game path</Text>}
			<div className="grow" />
			<Button style={{ minWidth: '40%' }} onClick={() => { openModal(<SetGameModal initialValue={gamePath} /> )}}>Set game path
			</Button>
		</div>
		<LineEdit disabled value={gamePath} />
		<hr />

		<Text>Package legacy projects as playable mods</Text>
		<Button onClick={() => {/* FIXME */}}>Export mod from legacy TCRepainter data</Button>
		<Button onClick={() => {/* FIXME */}}>Export files/images-only mod</Button>
		<hr />

		<Text>Towermod (New projects only)</Text>
		<div className="hbox gap">
			<Button
				className="grow"
				disabled={!game}
				onClick={async () => {
					await newProject()
					toast("New project initialized")
				}}
			>
				New project
			</Button>
			<Button className="grow" onClick={() => {/* FIXME */}}>Load project</Button>
		</div>
		<div className="hbox gap">
			<Button className="grow" onClick={() => {/* FIXME */}}>Save project</Button>
			<Button className="grow" onClick={() => {/* FIXME */}}>Browse project</Button>
		</div>
		<Button onClick={() => {/* FIXME */}}>Export Towermod project</Button>
		<hr />

		<Text>Cache</Text>

		<div className="hbox gap">
			<Button className="grow" onClick={() => {/* FIXME */}}>Clear cache</Button>
			<Button className="grow" onClick={() => {/* FIXME */}}>Nuke all cached data</Button>
		</div>
		<Button className="grow" onClick={() => {/* FIXME */}}>Browse cache</Button>

	</div>
}

