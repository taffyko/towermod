import { newApi as api } from "@/api"
import { openModal } from "@/app/Modal"
import { ProjectDetailsFormData, ProjectDetailsModal } from "@/app/ProjectDetailsModal"
import { toast } from "@/app/Toast"
import { saveProject } from "@/appUtil"
import { Button } from "@/components/Button"
import { showError } from "@/components/Error"
import FilePathEdit from "@/components/FilePathEdit"
import { LineEdit } from "@/components/LineEdit"
import Text from "@/components/Text"
import { actions, dispatch } from "@/redux"
import { assert } from "@/util"
import { copyFile, filePicker, folderPicker, openFolder } from "@/util/rpc"
import { Project } from "@towermod"
import { win32 as path } from "path"
import { useEffect, useState } from "react"
import { spin } from "../GlobalSpinner"
import { ConfirmModal } from "../Modal"

function SetGameModal(props: {
	initialValue: string,
}) {
	const [gamePath, setGamePath] = useState(props.initialValue)
	return <ConfirmModal title="Set game path" onConfirm={async () => {
		await spin(api.setGame(gamePath))
		if (gamePath) {
			toast("Game path set")
		} else {
			toast("No game set...", { type: 'warning' })
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
	// BUG: use suspense query to trigger global loading spinner
	const { data: game } = api.getGame.useQuery()
	const { data: isDataLoaded } = api.isDataLoaded.useQuery()
	const { data: project } = api.getProject.useQuery()

	const [gamePath, setGamePath] = useState(game?.filePath || "")
	useEffect(() => {
		setGamePath(game?.filePath || "")
	}, [game])

	return <div className="vbox gap">
		{/* <Button onClick={onClickOpenTracingWindow}>Open Tracing Window</Button> */}
		<div className="hbox">
			{game ? <span>Valid game selected</span> : <span className="text-(--color-warn)">Please set a valid game path</span>}
			<div className="grow" />
			<Button className="min-w-[40%]" onClick={() => { openModal(<SetGameModal initialValue={gamePath} /> )}}>
				Set game path
			</Button>
		</div>
		<LineEdit className="w-auto" disabled value={gamePath} />
		<hr />

		<Text>Package legacy projects as playable mods</Text>
		<Button disabled={!game} onClick={onClickExportLegacy}>Export mod from legacy TCRepainter data</Button>
		<Button disabled={!game} onClick={onClickExportFilesOnly}>Export files/images-only mod</Button>
		<hr />

		<Text>Towermod (New projects only)</Text>
		<div className="hbox gap">
			<Button
				className="grow"
				disabled={!game}
				onClick={onClickNewProject}
			>
				New project
			</Button>
			<Button disabled={!game} className="grow" onClick={onClickLoadProject}>Load project</Button>
		</div>
		<div className="hbox gap">
			<Button disabled={!isDataLoaded} className="grow" onClick={spin(onClickSaveProject)}>Save project</Button>
			<Button disabled={!project} className="grow" onClick={onClickBrowseProject}>Browse project</Button>
		</div>
		<Button disabled={!project} onClick={onClickExportProject}>Export Towermod project</Button>
		<hr />

		<Text>Cache</Text>

		<div className="hbox gap">
			<Button disabled={!game} className="grow" onClick={onClickClearGameCache}>
				Clear game cache</Button>
			<Button className="grow" onClick={onClickNukeCache}>
				Nuke all cached data
			</Button>
		</div>
		<Button className="grow" onClick={spin(onClickBrowseCache)}>Browse cache</Button>
	</div>

	async function onClickNewProject() {
		if (project) {
			let confirmed = false
			await openModal(
				<ConfirmModal onConfirm={() => { confirmed = true }}>
					Any unsaved project changes will be lost
				</ConfirmModal>
			)
			if (!confirmed) { return }
		}
		await spin(api.newProject())
		toast("New project initialized")
	}

	async function applyProjectDetailsForm(project: Project, form: ProjectDetailsFormData): Promise<Project> {
		const { coverPath, iconPath, ...rest } = form
		if (form.coverPath) {
			const coverDest = path.join(form.dirPath, 'cover.png')
			await copyFile(form.coverPath, coverDest)
		}
		if (form.iconPath) {
			const iconDest = path.join(form.dirPath, 'icon.png')
			await copyFile(form.iconPath, iconDest)
		}

		const newProject: Project = { ...project, ...rest }
		return newProject
	}

	async function updateProjectDetails(project: Project, confirmText = "Save"): Promise<boolean> {
		let confirmed = false
		await openModal(
			<ProjectDetailsModal project={project} confirmText={confirmText} onConfirm={spin(async (form: ProjectDetailsFormData) => {
				confirmed = true
				const newProject = await spin(applyProjectDetailsForm(project, form))
				await api.editProjectInfo(newProject)
			})} />
		)
		return confirmed
	}

	async function onClickExportProject() {
		if (!project) { return }
		const confirmed = await updateProjectDetails(project, "Export")
		if (!confirmed) { return }
		await spin(api.exportMod('BinaryPatch'))
		toast("Project exported")
		dispatch(actions.setCurrentTab('Mods'))
	}

	async function onClickExportLegacy() {
		const patchPath = await filePicker({ filters: [{ name: "TCRepainter patch", extensions: ["json", "zip"] }] })
		if (!patchPath) { return }
		const manifestPath = path.join(path.dirname(patchPath), 'manifest.toml')
		const project = await spin(api.loadManifest({ manifestPath, projectType: 'Legacy' }))
		await openModal(<ProjectDetailsModal confirmText="Export" project={project} onConfirm={async (form) => {
			assert(project)
			const newProject = await spin(applyProjectDetailsForm(project, form))
			await spin(api.exportFromLegacy({ patchPath, project: newProject }))
			toast("Project exported")
			dispatch(actions.setCurrentTab('Mods'))
		}} />)
	}

	async function onClickExportFilesOnly() {
		const dirPath = await folderPicker()
		if (!dirPath) { return }
		const manifestPath = path.join(dirPath, 'manifest.toml')
		const project = await spin(api.loadManifest({ manifestPath, projectType: 'FilesOnly' }))
		await openModal(<ProjectDetailsModal confirmText="Export" project={project} onConfirm={async (form) => {
			assert(project)
			const newProject = await spin(applyProjectDetailsForm(project, form))
			await spin(api.exportFromFiles(newProject))
			toast("Project exported")
			dispatch(actions.setCurrentTab('Mods'))
		}} />)


	}

	async function onClickSaveProject() {
		await saveProject()
	}

	async function onClickBrowseProject() {
		if (project?.dirPath) {
			await openFolder(project.dirPath)
			toast("Project folder opened")
		}
	}

	async function onClickBrowseCache() {
		const cachePath = await api.getCachePath()
		assert(cachePath)
		await openFolder(cachePath)
		toast("Cache folder opened")
	}

	function onClickClearGameCache() {
		openModal(
			<ConfirmModal onConfirm={spin(onConfirm)}>
				Any unsaved data will be lost
			</ConfirmModal>
		)
		async function onConfirm() {
			await api.clearGameCache()
			await new Promise((resolve) => {
				toast("Game cache deleted. Reloading...")
				window.onload = resolve
				window.location.reload()
			})
		}
	}

	function onClickNukeCache() {
		openModal(
			<ConfirmModal onConfirm={spin(onConfirm)}>
				Any unsaved data will be lost
			</ConfirmModal>
		)
		async function onConfirm() {
			await api.nukeCache()
			await new Promise((resolve) => {
				toast("Cache nuked. Reloading...")
				window.onload = resolve
				window.location.reload()
			})
		}
	}

	async function onClickLoadProject() {
		const projectsPath = await api.getDefaultProjectDirPath()
		const manifestPath = await filePicker({
			filters: [{ name: "Towermod Project (manifest.toml)", extensions: ["toml"] }],
			startingDirectory: projectsPath,
		})
		if (!manifestPath) { return }

		const warningMsg = await api.loadProjectPreflight(manifestPath)
		if (warningMsg) {
			<ConfirmModal title="Warning" onConfirm={spin(onConfirm)}>
				<pre>{warningMsg}</pre>
			</ConfirmModal>
		} else {
			spin(onConfirm())
		}

		async function onConfirm() {
			assert(manifestPath)
			await api.loadProject(manifestPath)
			toast("Project loaded")
		}
	}

	async function onClickOpenTracingWindow() {
		const { Window } = await import('@tauri-apps/api/window')
		const { Webview } = await import('@tauri-apps/api/webview')

		// TODO: figure out how to get multiple webviews working
		const tracingWindow = new Window('tracing', { title: "Tracing" })
		tracingWindow.once('tauri://created', function () {
			toast("Tracing window opened")
			const tracingWebview = new Webview(tracingWindow, 'tracing', { x: 0, y: 0, width: 600, height: 600, url: 'edge://tracing' })
			tracingWebview.once('tauri://error', function (e) {
				showError(e.payload)
			})
		})
		tracingWindow.once('tauri://error', function (e) {
			showError(e.payload)
		})
	}
}
