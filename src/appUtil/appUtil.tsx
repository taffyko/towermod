import { spin } from "@/app/GlobalSpinner";
import { dispatch, store, useAppSelector } from "@/redux";
import { api } from '@/api'
import { CstcData, Project } from "@towermod";
import { openModal } from "@/app/Modal";
import { ProjectDetailsFormData, ProjectDetailsModal } from "@/app/ProjectDetailsModal";
import { awaitRtk } from "@/api/helpers";
import { toast } from "@/app/Toast";
import { UniqueTowermodObject } from "@/redux/reducers/data";
import { assert, assertUnreachable, unwrap } from "@/util";
import { skipToken } from "@reduxjs/toolkit/query";

export async function saveProject() {
	const updateData = (data: CstcData) => awaitRtk(dispatch(api.endpoints.updateData.initiate(data)))
	const saveProject = (dirPath: string) => awaitRtk(dispatch(api.endpoints.saveProject.initiate(dirPath)))
	const saveNewProject = (form: ProjectDetailsFormData) => awaitRtk(dispatch(api.endpoints.saveNewProject.initiate(form)))
	const project = await awaitRtk(spin(dispatch(api.endpoints.getProject.initiate())))

	await spin(updateData(store.getState().data))
	if (project && project.dirPath) {
		await spin(saveProject(project.dirPath))
		toast("Project saved")
	} else {
		openModal(<ProjectDetailsModal confirmText="Save" newProject onConfirm={async (form) => {
			await spin(saveNewProject(form))
			toast("Project saved")
		}} />)
	}
}


export async function installMods(files: string[]) {
	const { dispatch, actions } = await import('@/redux');
	for (const file of files) {
		const modInfo = await awaitRtk(spin(dispatch(api.endpoints.installMod.initiate(file))))
		if (modInfo) {
			toast(`Installed mod: "${modInfo.name}" (v${modInfo.version})`);
			dispatch(actions.setCurrentTab('Mods'))
			dispatch(actions.selectMod(modInfo.id))
		}
	}
}

export function useObjectDisplayName(obj: UniqueTowermodObject | undefined): string | undefined {
	let objTypeId;
	if (obj) {
		switch (obj._type) {
			case 'ObjectType':
				objTypeId = obj.id
			break; case 'ObjectInstance':
				objTypeId = obj.objectTypeId
			break; case 'Container':
				objTypeId = obj.objectIds[0]
		}
	}
	const { currentData: objType } = api.useGetObjectTypeQuery(objTypeId ?? skipToken)

	return useAppSelector(({ data }) => {
		if (!obj) { return }
		const typeName = obj._type
		switch (typeName) {
			case 'Layout':
				return `Layout: ${obj.name}`
			case 'LayoutLayer':
				return `Layer ${obj.id}: ${obj.name}`
			case 'ObjectInstance': {
				if (!objType) { return }
				const plugin = data.editorPlugins[objType.pluginId]
				const pluginName = plugin.stringTable.name
				const objectName = objType.name
				return `Instance: ${pluginName} (${objectName}: ${obj.id})`
			} case 'Animation':
				return `Animation ${obj.id}: ${obj.name}`
			case 'Behavior':
				return `Behavior: ${obj.name}`
			case 'Container':
				if (!objType) { return }
				return `Container: ${objType.name}`
			case 'Family':
				return `Family: ${obj.name}`
			case 'ObjectType': {
				if (!objType) { return }
				const plugin = data.editorPlugins[objType.pluginId]
				const pluginName = plugin.stringTable.name
				return `Type ${obj.id}: (${pluginName}: ${objType.name})`
			} case 'ObjectTrait':
				return `Trait: ${obj.name}`
			case 'AppBlock':
				return 'Project Settings'
			default:
				assertUnreachable(typeName)
		}
	})
}
