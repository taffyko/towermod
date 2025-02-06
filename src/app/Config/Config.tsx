import { api } from "@/api";
import { useEffect, useState } from "react";
import { toast } from "@/app/Toast";
import { Button } from "@/components/Button";
import { LineEdit } from "@/components/LineEdit";
import Text from "@/components/Text";
import { filePicker } from "@/util/rpc";
import { ConfirmModal } from "../Modal";
import { openModal } from "@/app/Modal";
import { useTwoWayBinding } from "@/util/hooks";
import { FileDialogOptions } from "@towermod";
import { win32 as path } from "path";

export function FilePathInput(props: Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> & {
	value?: string,
	onChange?: (value: string) => void,
	options?: FileDialogOptions,
}) {
	const { value: externalValue, onChange, options, ...htmlProps } = props;

	const [value, setValue] = useTwoWayBinding(externalValue, onChange, "");

	return <div>
		<LineEdit {...htmlProps} value={value} onChange={e => setValue(e.target.value)}></LineEdit>
		<Button onClick={async () => {
			const file = await filePicker(options);
			if (file != null) { setValue(file) }
		}}>
			Browse
		</Button>
	</div>
}

function SetGameModal(props: {
	initialValue: string,
}) {
	const [setGame] = api.useSetGameMutation()
	const [gamePath, setGamePath] = useState(props.initialValue)
	return <ConfirmModal onConfirm={() => {
		setGame(gamePath)
	}} confirmText="Set path">
		Any unsaved project changes will be lost.
		<FilePathInput value={gamePath} onChange={setGamePath} options={{
			fileName: gamePath,
			startingDirectory: path.dirname(gamePath),
			filters: [{ name: "Construct Classic game", extensions: ["exe"] }]
		}} />
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

