import { spin } from "@/app/GlobalSpinner";
import { dispatch, useAppSelector } from "@/redux";
import { api } from '@/api'
import { openModal } from "@/app/Modal";
import { ProjectDetailsFormData, ProjectDetailsModal } from "@/app/ProjectDetailsModal";
import { awaitRtk } from "@/api/helpers";
import { toast } from "@/app/Toast";
import { ObjectForType, UniqueObjectLookup } from "@/util";
import { assertUnreachable, useMemoAsyncWithCleanup } from "@/util";
import { skipToken } from "@reduxjs/toolkit/query";

export async function saveProject() {
	const saveProject = (dirPath: string) => awaitRtk(dispatch(api.endpoints.saveProject.initiate(dirPath)))
	const saveNewProject = (form: ProjectDetailsFormData) => awaitRtk(dispatch(api.endpoints.saveNewProject.initiate(form)))
	const project = await awaitRtk(spin(dispatch(api.endpoints.getProject.initiate())))

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

export function useTowermodObject<T extends UniqueObjectLookup>(obj: T | undefined): ObjectForType<T['_type']> | undefined {
	// TODO: subscribe to redux store changes & rerender when cache is invalidated, in the same way that the generated hooks do
	// - can api.endpoints.*.select() be used for this?
	const result = useMemoAsyncWithCleanup(() => {
		if (!obj) { return [undefined] }
		const promise = (() => {
			const type = obj._type
			switch (type) {
				case 'ObjectType': return dispatch(api.endpoints.getObjectType.initiate(obj));
				case 'ObjectInstance': return dispatch(api.endpoints.getObjectInstance.initiate(obj));
				case 'Container': return dispatch(api.endpoints.getContainer.initiate(obj));
				case 'Animation': return dispatch(api.endpoints.getAnimation.initiate(obj));
				case 'Behavior': return dispatch(api.endpoints.getBehavior.initiate(obj));
				case 'Family': return dispatch(api.endpoints.getFamily.initiate(obj));
				case 'ObjectTrait': return dispatch(api.endpoints.getObjectTrait.initiate(obj));
				case 'AppBlock': return dispatch(api.endpoints.getAppBlock.initiate());
				case 'Layout': return dispatch(api.endpoints.getLayout.initiate(obj));
				case 'LayoutLayer': return dispatch(api.endpoints.getLayoutLayer.initiate(obj));
				default: assertUnreachable(type)
			}
		})()
		return [promise as any, () => promise.unsubscribe()]
	}, [obj])
	return result?.data
}

export function useObjectDisplayName(objLookup: UniqueObjectLookup | undefined): string | undefined {
	const obj = useTowermodObject(objLookup);

	let objTypeId;
	let pluginId;
	switch (obj?._type) {
		case 'ObjectType': objTypeId = obj.id; pluginId = obj.pluginId
		break; case 'Container': objTypeId = obj.objectIds[0]
	}
	const { currentData: objType } = api.useGetObjectTypeQuery(objTypeId != null ? { id: objTypeId } : skipToken)
	switch (obj?._type) {
		case 'ObjectInstance': pluginId = objType?.pluginId
	}
	const { currentData: plugin } = api.useGetEditorPluginQuery(pluginId ?? skipToken)

	if (!obj) { return }
	const typeName = obj._type
	switch (typeName) {
		case 'Layout':
			return `Layout: ${obj.name}`
		case 'LayoutLayer':
			return `Layer ${obj.id}: ${obj.name}`
		case 'ObjectInstance': {
			if (!objType || !plugin) { return }
			const pluginName = plugin.stringTable.name
			const objectName = objType.name
			return `Instance: ${pluginName} (${objectName}: ${obj.id})`
		} case 'Animation':
			return `Animation ${obj.id}: ${obj.name}`
		case 'Behavior':
			return `Behavior: ${obj.name}`
		case 'Container':
			if (!objType || !plugin) { return }
			return `Container: ${objType.name}`
		case 'Family':
			return `Family: ${obj.name}`
		case 'ObjectType': {
			if (!plugin) { return }
			const pluginName = plugin.stringTable.name
			return `Type ${obj.id}: (${pluginName}: ${obj.name})`
		} case 'ObjectTrait':
			return `Trait: ${obj.name}`
		case 'AppBlock':
			return 'Project Settings'
		default:
			assertUnreachable(typeName)
	}
}
