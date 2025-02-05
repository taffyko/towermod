import { api } from "@/api";
import { useCallback, useEffect, useState } from "react";
import { toast } from "@/app/Toast";
import { Button } from "@/components/Button";
import { LineEdit } from "@/components/LineEdit";
import Text from "@/components/Text";
import { filePicker } from "@/util/rpc";
import { ConfirmModal } from "../Modal";


export function FileDialog(props: Omit<React.ComponentProps<'input'>, 'onChange'> & {
	onChange: (value: string) => void,
}) {
	const { value: externalValue, onChange, ...htmlProps } = props;

	// const [internalValue, _setInternalValue] = useState("");
	// const setInternalValue = useCallback(() => {

	// }, [setInternalValue])
	// useEffect(() => {
	// 	if (externalValue !== undefined) {
	// 		_setInternalValue(externalValue)
	// 	}
	// }, [externalValue])

	return <div>
		<LineEdit {...htmlProps} onChange={e => onChange(e.target.value)}></LineEdit>
		<Button onClick={async () => {
			const file = await filePicker();
			if (file != null) { onChange(file) }
		}}>
			Browse
		</Button>
	</div>
}

function SetGameModal(props: {
	initialValue: string,
	onConfirm: (value: string) => void,
}) {
	const { initialValue, onConfirm } = props;
	const [gamePath, setGamePath] = useState(initialValue)
	return <ConfirmModal onConfirm={() => onConfirm(gamePath)} confirmText="Set path">
		Any unsaved project changes will be lost.
		<FileDialog value={gamePath} onChange={setGamePath} />
	</ConfirmModal>
}

export const Config = () => {
	const { data: game } = api.useGetGameQuery()
	const [setGame] = api.useSetGameMutation()
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
			<Button style={{ minWidth: '40%' }} onClick={() => { /* FIXME */}}>Set game path
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

