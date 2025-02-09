import { api } from "@/api";
import { useEffect, useState } from "react";
import { toast } from "@/app/Toast";
import { Button } from "@/components/Button";
import { LineEdit } from "@/components/LineEdit";
import Text from "@/components/Text";
import { ConfirmModal } from "../Modal";
import { openModal } from "@/app/Modal";
import { win32 as path } from "path";
import FilePathEdit from "@/components/FilePathEdit";
import { spin } from "../GlobalSpinner";
import { throwOnError } from "@/components/Error";
import { openFolder } from "@/util/rpc";
import { assert } from "@/util";

function SetGameModal(props: {
	initialValue: string,
}) {
	const [setGame] = api.useSetGameMutation()
	const [gamePath, setGamePath] = useState(props.initialValue)
	return <ConfirmModal title="Set game path" onConfirm={async () => {
		await spin(setGame(gamePath));
		if (gamePath) {
			toast("Game path set");
		} else {
			toast("No game set...", { type: 'warning' });
		}
	}} confirmText="Set path">
		Any unsaved project changes will be lost.
		<FilePathEdit value={gamePath} onChange={setGamePath} options={{
			fileName: gamePath,
			startingDirectory: path.dirname(gamePath),
			filters: [{ name: "Construct Classic game", extensions: ["exe"] }]
		}} />
	</ConfirmModal>
}

export const Config = () => {
	const { data: game } = api.useGetGameQuery()
	const { data: isDataLoaded } = api.useIsDataLoadedQuery()
	const { data: project } = api.useGetProjectQuery()
	const [newProject] = api.useNewProjectMutation()
	const [nukeCache] = api.useNukeCacheMutation()
	const [clearGameCache] = api.useClearGameCacheMutation()
	const [getCachePath] = api.useLazyCachePathQuery()

	const [gamePath, setGamePath] = useState(game?.filePath || "")
	useEffect(() => {
		setGamePath(game?.filePath || "")
	}, [game])

	return <div className="vbox gap">
		<div className="hbox">
			{game ? <span>Valid game selected</span> : <span style={{ color: 'var(--color-warn)' }}>Please set a valid game path</span>}
			<div className="grow" />
			<Button style={{ minWidth: '40%' }} onClick={() => { openModal(<SetGameModal initialValue={gamePath} /> )}}>Set game path
			</Button>
		</div>
		<LineEdit disabled value={gamePath} />
		<hr />

		<Text>Package legacy projects as playable mods</Text>
		<Button disabled={!game} onClick={() => {/* FIXME */}}>Export mod from legacy TCRepainter data</Button>
		<Button disabled={!game} onClick={() => {/* FIXME */}}>Export files/images-only mod</Button>
		<hr />

		<Text>Towermod (New projects only)</Text>
		<div className="hbox gap">
			<Button
				className="grow"
				disabled={!game}
				onClick={async () => {
					await spin(newProject())
					toast("New project initialized")
				}}
			>
				New project
			</Button>
			<Button disabled={!game} className="grow" onClick={() => {/* FIXME */}}>Load project</Button>
		</div>
		<div className="hbox gap">
			<Button disabled={!isDataLoaded} className="grow" onClick={() => {/* FIXME */}}>Save project</Button>
			<Button disabled={!project} className="grow" onClick={() => {/* FIXME */}}>Browse project</Button>
		</div>
		<Button disabled={!project} onClick={() => {/* FIXME */}}>Export Towermod project</Button>
		<hr />

		<Text>Cache</Text>

		<div className="hbox gap">
			<Button disabled={!game} className="grow" onClick={() => {
				openModal(
					<ConfirmModal onConfirm={onConfirm}>
						Any unsaved data will be lost
					</ConfirmModal>
				)
				async function onConfirm() {
					await throwOnError(spin(clearGameCache()))
					await spin(new Promise((resolve) => {
						toast("Game cache deleted. Reloading...")
						window.onload = resolve
						window.location.reload()
					}))
				}
			}}>Clear game cache</Button>
			<Button className="grow" onClick={() => {
				openModal(
					<ConfirmModal onConfirm={onConfirm}>
						Any unsaved data will be lost
					</ConfirmModal>
				)
				async function onConfirm() {
					await throwOnError(spin(nukeCache()))
					await spin(new Promise((resolve) => {
						toast("Cache nuked. Reloading...")
						window.onload = resolve
						window.location.reload()
					}))
				}
			}}>Nuke all cached data</Button>
		</div>
		<Button className="grow" onClick={async () => {
			const { data: cachePath } = await throwOnError(spin(getCachePath()));
			assert(cachePath)
			await openFolder(cachePath)
			toast("Cache folder opened")
		}}>Browse cache</Button>

	</div>
}

