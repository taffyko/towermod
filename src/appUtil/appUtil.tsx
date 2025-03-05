import { spin } from "@/app/GlobalSpinner";
import { dispatch, store, useAppSelector } from "@/redux";
import { api } from '@/api'
import { openModal } from "@/app/Modal";
import { ProjectDetailsFormData, ProjectDetailsModal } from "@/app/ProjectDetailsModal";
import { awaitRtk } from "@/api/helpers";
import { toast } from "@/app/Toast";
import { ObjectForType, TowermodObject, UniqueObjectLookup, UniqueTowermodObject, arrayShallowEqual, objectShallowEqual, useRerender } from "@/util";
import { assertUnreachable, useMemoAsyncWithCleanup } from "@/util";
import { ApiEndpointQuery, QueryDefinition, skipToken } from "@reduxjs/toolkit/query";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { stringify } from "querystring";

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

export type QueryScopeFn = <QueryArg, Endpoint extends ApiEndpointQuery<QueryDefinition<QueryArg, any, any, any>, any>>(endpoint: Endpoint, arg: QueryArg) => ReturnType<ReturnType<Endpoint['select']>>

// allows a component to dynamically subscribe to RTK endpoints without using the generated hooks
export function useQueryScope() {
	type QueryEndpoint = ApiEndpointQuery<QueryDefinition<any, any, any, any, any>, any>
	const [selection, setSelection] = useState<Record<string, unknown>>({})
	const selectionRef = useRef<Record<string, unknown>>({})

	// subscriptions list is reset each time the selector updates (any of the query results update)
	// then is populated by any subsequent endpoints that are called
	const endpoints = useMemo<Record<string, [QueryEndpoint, any, any, any]>>(() => {
		return {}
	}, [selection])
	useEffect(() => {
		return () => {
			for (const [_endpoint, _arg, promise] of Object.values(endpoints)) {
				promise.unsubscribe()
			}
		}
	}, [endpoints])

	const query = useCallback<QueryScopeFn>((endpoint, arg) => {
		const key = JSON.stringify({ [endpoint.name]: arg })
		if (!(key in endpoints)) {
			endpoints[key] = [endpoint, arg, dispatch(endpoint.initiate(arg)), endpoint.select(arg)]
		}
		const state = store.getState();
		const select = endpoints[key][3]
		return select(state as any) as any
	}, [endpoints])

	useSyncExternalStore(store.subscribe, () => {
		const state = store.getState();
		const selection: Record<string, unknown> = {};
		for (const [key, [_endpoint, _arg, _promise, select]] of Object.entries(endpoints)) {
			selection[key] = select(state as any)
		}
		// trigger re-render if the data from *any* of the submitted queries has updated
		for (const key of Object.keys(selection)) {
			// @ts-ignore
			// if this is the first request, and not an update - track the request, but don't trigger a re-render
			if (!(key in selectionRef.current)) {
				selectionRef.current[key] = selection[key]
				continue
			}
			// if one of the previously initiated requests has updated, trigger a re-render
			// @ts-ignore
			if (selection[key]?.data != selectionRef.current[key]?.data) {
				selectionRef.current = selection
				setSelection(selection)
				break
			}
		}
		return selectionRef.current
	})

	return query
}

export async function updateTowermodObject<T extends UniqueTowermodObject>(obj: T) {
	let endpoint: any;
	const type = obj._type
	switch (type) {
		case 'ObjectType': endpoint = api.endpoints.updateObjectType
		break; case 'ObjectInstance': endpoint = api.endpoints.updateObjectInstance
		break; case 'Container': endpoint = api.endpoints.updateContainer
		break; case 'Animation': endpoint = api.endpoints.updateAnimation
		break; case 'Behavior': endpoint = api.endpoints.updateBehavior
		break; case 'ObjectTrait': endpoint = api.endpoints.updateObjectTrait
		break; case 'AppBlock': endpoint = api.endpoints.updateAppBlock
		break; case 'Layout': endpoint = api.endpoints.updateLayout
		break; case 'LayoutLayer': endpoint = api.endpoints.updateLayoutLayer
		break; default: endpoint = undefined
	}
	if (!endpoint) { return }
	await awaitRtk(dispatch(endpoint.initiate(obj)))
}

export function useTowermodObject<T extends UniqueObjectLookup>(obj: T | undefined): ObjectForType<T['_type']> | undefined {
	const query = useQueryScope()

	const type = obj?._type
	let endpoint: any;
	switch (type) {
		case 'ObjectType': endpoint = api.endpoints.getObjectType
		break; case 'ObjectInstance': endpoint = api.endpoints.getObjectInstance
		break; case 'Container': endpoint = api.endpoints.getContainer
		break; case 'Animation': endpoint = api.endpoints.getAnimation
		break; case 'Behavior': endpoint = api.endpoints.getBehavior
		break; case 'Family': endpoint = api.endpoints.getFamily
		break; case 'ObjectTrait': endpoint = api.endpoints.getObjectTrait
		break; case 'AppBlock': endpoint = api.endpoints.getAppBlock
		break; case 'Layout': endpoint = api.endpoints.getLayout
		break; case 'LayoutLayer': endpoint = api.endpoints.getLayoutLayer
		break; case undefined: endpoint = undefined
		break; default: assertUnreachable(type)
	}

	if (obj) {
		const info = query(endpoint, obj)
		return info.data
	}
}

export function useObjectDisplayName(objLookup: UniqueObjectLookup | null | undefined): string | undefined {
	const obj = useTowermodObject(objLookup ?? undefined);

	let objTypeId;
	let pluginId;
	switch (obj?._type) {
		case 'ObjectInstance': objTypeId = obj.objectTypeId
		break; case 'ObjectType': pluginId = obj.pluginId
		break; case 'Container': objTypeId = obj.id
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
			if (!objType) { return }
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
