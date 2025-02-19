import { api } from "@/api";
import { useContext, useEffect, useState } from "react";
import { toast } from "@/app/Toast";
import { Button } from "@/components/Button";
import { LineEdit } from "@/components/LineEdit";
import Text from "@/components/Text";
import { ConfirmModal } from "../Modal";
import { openModal } from "@/app/Modal";
import { win32 as path } from "path";
import FilePathEdit from "@/components/FilePathEdit";
import { spin, useSpinQuery } from "../GlobalSpinner";
import { throwOnError } from "@/components/Error";
import { copyFile, filePicker, folderPicker, openFolder } from "@/util/rpc";
import { assert } from "@/util";
import { ProjectDetailsFormData, ProjectDetailsModal } from "@/app/ProjectDetailsModal";
import { Project } from "@towermod";
import { actions, dispatch } from "@/redux";

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
	const { data: game } = useSpinQuery(api.useGetGameQuery())
	const { data: isDataLoaded } = useSpinQuery(api.useIsDataLoadedQuery())
	const { data: project } = useSpinQuery(api.useGetProjectQuery())
	const [newProject] = api.useNewProjectMutation()
	const [nukeCache] = api.useNukeCacheMutation()
	const [clearGameCache] = api.useClearGameCacheMutation()
	const [getCachePath] = api.useLazyCachePathQuery()
	const [getProjectsPath] = api.useLazyProjectsPathQuery()
	const [editProjectInfo] = api.useEditProjectInfoMutation()
	const [loadProjectPreflight] = api.useLoadProjectPreflightMutation()
	const [loadProject] = api.useLoadProjectMutation()
	const [saveNewProject] = api.useSaveNewProjectMutation()
	const [saveProject] = api.useSaveProjectMutation()
	const [exportProject] = api.useExportModMutation()

	const [loadManifest] = api.useLazyLoadManifestQuery()
	const [exportFromLegacy] = api.useExportFromLegacyMutation()
	const [exportFromFiles] = api.useExportFromFilesMutation()

	const [gamePath, setGamePath] = useState(game?.filePath || "")
	useEffect(() => {
		setGamePath(game?.filePath || "")
	}, [game])

	return <div className="vbox gap">
		<div className="hbox">
			{game ? <span>Valid game selected</span> : <span style={{ color: 'var(--color-warn)' }}>Please set a valid game path</span>}
			<div className="grow" />
			<Button style={{ minWidth: '40%' }} onClick={() => { openModal(<SetGameModal initialValue={gamePath} /> )}}>
				Set game path
			</Button>
		</div>
		<LineEdit disabled value={gamePath} />
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
				onClick={async () => {
					await spin(newProject())
					toast("New project initialized")
				}}
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

	async function applyProjectDetailsForm(project: Project, form: ProjectDetailsFormData): Promise<Project> {
		const { coverPath, iconPath, ...rest } = form
		if (form.coverPath) {
			const coverDest = path.join(form.dirPath, 'cover.png');
			await copyFile(form.coverPath, coverDest)
		}
		if (form.iconPath) {
			const iconDest = path.join(form.dirPath, 'icon.png');
			await copyFile(form.iconPath, iconDest)
		}

		const newProject: Project = { ...project, ...rest }
		return newProject
	}

	async function updateProjectDetails(project: Project, confirmText = "Save"): Promise<boolean> {
		let confirmed = false;
		await openModal(
			<ProjectDetailsModal project={project} confirmText={confirmText} onConfirm={spin(async (form: ProjectDetailsFormData) => {
				form = form;
				confirmed = true
				const newProject = await spin(applyProjectDetailsForm(project, form));
				await throwOnError(editProjectInfo(newProject))
			})} />
		)
		return confirmed
	}

	async function onClickExportProject() {
		if (!project) { return }
		const confirmed = await updateProjectDetails(project, "Export");
		if (!confirmed) { return }
		await throwOnError(spin(exportProject('BinaryPatch')))
		toast("Project exported")
		dispatch(actions.setCurrentTab('Mods'));
	}

	async function onClickExportLegacy() {
		const patchPath = await filePicker({ filters: [{ name: "TCRepainter patch", extensions: ["json", "zip"] }] });
		if (!patchPath) { return }
		const manifestPath = path.join(path.dirname(patchPath), 'manifest.toml');
		const { data: project } = await throwOnError(spin(loadManifest({ manifestPath, projectType: 'Legacy' })))
		await openModal(<ProjectDetailsModal confirmText="Export" project={project} onConfirm={async (form) => {
			assert(project)
			const newProject = await spin(applyProjectDetailsForm(project, form))
			await throwOnError(spin(exportFromLegacy({ patchPath, project: newProject })))
			toast("Project exported")
			dispatch(actions.setCurrentTab('Mods'));
		}} />)
	}

	async function onClickExportFilesOnly() {
		const dirPath = await folderPicker();
		if (!dirPath) { return }
		const manifestPath = path.join(dirPath, 'manifest.toml');
		const { data: project } = await throwOnError(spin(loadManifest({ manifestPath, projectType: 'FilesOnly' })))
		await openModal(<ProjectDetailsModal confirmText="Export" project={project} onConfirm={async (form) => {
			assert(project)
			const newProject = await spin(applyProjectDetailsForm(project, form))
			await throwOnError(spin(exportFromFiles(newProject)))
			toast("Project exported")
			dispatch(actions.setCurrentTab('Mods'));
		}} />)


	}

	async function onClickSaveProject() {
		if (project && project.dirPath) {
			await throwOnError(saveProject(project.dirPath))
			toast("Project saved")
		} else {
			openModal(<ProjectDetailsModal confirmText="Save" newProject onConfirm={async (form) => {
				await throwOnError(saveNewProject(form));
				toast("Project saved")
			}} />)
		}
	}

	async function onClickBrowseProject() {
		if (project?.dirPath) {
			await openFolder(project.dirPath)
			toast("Project folder opened")
		}
	}

	async function onClickBrowseCache() {
		const { data: cachePath } = await throwOnError(getCachePath());
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
			await throwOnError(clearGameCache())
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
			await throwOnError(nukeCache())
			await new Promise((resolve) => {
				toast("Cache nuked. Reloading...")
				window.onload = resolve
				window.location.reload()
			})
		}
	}

	async function onClickLoadProject() {
		const { data: projectsPath } = await getProjectsPath();
		const manifestPath = await filePicker({
			filters: [{ name: "Towermod Project (manifest.toml)", extensions: ["toml"] }],
			startingDirectory: projectsPath,
		});
		if (!manifestPath) { return }

		const { data: warningMsg } = await throwOnError(loadProjectPreflight(manifestPath))
		if (warningMsg) {
			<ConfirmModal title="Warning" onConfirm={spin(onConfirm)}>
				<pre>{warningMsg}</pre>
			</ConfirmModal>
		} else {
			spin(onConfirm())
		}

		async function onConfirm() {
			assert(manifestPath)
			await throwOnError(loadProject(manifestPath))
			toast("Project loaded")
		}
	}
}
