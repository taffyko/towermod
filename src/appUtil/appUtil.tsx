import newApi, { api } from '@/api'
import { awaitRtk } from '@/api/helpers'
import { spin } from "@/app/GlobalSpinner"
import { openModal } from "@/app/Modal"
import { ProjectDetailsFormData, ProjectDetailsModal } from "@/app/ProjectDetailsModal"
import { toast } from "@/app/Toast"
import { dispatch, store } from "@/redux"
import { ObjectForType, UniqueObjectLookup, UniqueTowermodObject, activateWindow, assertUnreachable, useMountEffect, useObjectUrl } from "@/util"
import { ApiEndpointMutation, ApiEndpointQuery, MutationDefinition, QueryDefinition, defaultSerializeQueryArgs, skipToken } from "@reduxjs/toolkit/query"
import { useCallback, useRef, useState, useSyncExternalStore } from "react"

export async function saveProject() {
	const saveProject = (dirPath: string) => newApi.saveProject(dirPath)
	const saveNewProject = (form: ProjectDetailsFormData) => newApi.saveNewProject(form)
	const project = await newApi.getProject()

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
	activateWindow()
	const { dispatch, actions } = await import('@/redux')
	for (const file of files) {
		const modInfo = await spin(newApi.installMod(file))
		if (modInfo) {
			toast(`Installed mod: "${modInfo.name}" (v${modInfo.version})`)
			dispatch(actions.setCurrentTab('Mods'))
			dispatch(actions.selectMod(modInfo.id))
		}
	}
}

// return type: { data: T, isLoading: boolean, isError: boolean, isSuccess: boolean, endpointName: string, error: any,  }
export type QueryScopeFn = <QueryArg, Endpoint extends ApiEndpointQuery<QueryDefinition<QueryArg, any, any, any>, any>>(endpoint: Endpoint, arg: QueryArg, queryName: string) => ReturnType<ReturnType<Endpoint['select']>> & { isLoading: boolean, error: any }
/**
 * Allows a component to dynamically subscribe to RTK endpoints without using the generated hooks.
 *
 * Each query initiated with useQueryScope must be given a `queryName`
 * If a query is initiated with the same queryName but different parameters, the previous query will be unsubscribed.
 */
export function useQueryScope(): [QueryScopeFn] {
	type QueryEndpoint = ApiEndpointQuery<QueryDefinition<any, any, any, any, any>, any>
	const [selection, setSelection] = useState<Record<string, unknown>>({})
	const selectionRef = useRef<Record<string, unknown>>({})
	const queriesRef = useRef<Record<string, string>>({})
	const endpointsRef = useRef<Record<string, [endpoint: QueryEndpoint, arg: any, promise: any, select: any, rendersSinceLastUse: number]>>({})

	for (const value of Object.values(endpointsRef.current)) {
		value[4]++
	}

	// Unsubscribe everything on unmount
	useMountEffect(() => {
		return () => {
			for (const [, , promise] of Object.values(endpointsRef.current)) {
				promise.unsubscribe()
			}
		}
	})

	const query = useCallback<QueryScopeFn>((endpoint, arg, queryName) => {
		const key = defaultSerializeQueryArgs({ endpointName: endpoint.name, queryArgs: arg, endpointDefinition: null as any})
		if (!(key in endpointsRef.current)) {
			endpointsRef.current[key] = [endpoint, arg, dispatch(endpoint.initiate(arg)), endpoint.select(arg), 0]
		} else {
			endpointsRef.current[key][4] = 0
		}

		// If a query was initiated with an existing queryName but with new params, unsubscribe the old query
		// TODO: what if the same query is initiated under two different queryNames?
		const oldKey = queriesRef.current[queryName]
		if (oldKey && oldKey != key) {
			const promise = endpointsRef.current[oldKey]?.[2]
			promise?.unsubscribe()
			delete endpointsRef.current[oldKey]
		}
		queriesRef.current[queryName] = key

		const state = store.getState()
		const select = endpointsRef.current[key][3]
		return select(state as any) as any
	}, [endpointsRef, selection])

	useSyncExternalStore(store.subscribe, () => {
		const state = store.getState()
		const selection: Record<string, unknown> = {}
		for (const [key, [_endpoint, _arg, _promise, select]] of Object.entries(endpointsRef.current)) {
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

	return [query]
}

export async function updateTowermodObject<T extends UniqueTowermodObject>(obj: T) {
	let endpoint: any
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

export function useTowermodObject<T extends UniqueObjectLookup>(obj: T | undefined, scope?: { query: QueryScopeFn, queryName: string }): { data: ObjectForType<T['_type']> | undefined, isLoading: boolean } {
	let query: QueryScopeFn
	let queryName = 'useTowermodObject'
	if (scope) {
		({ query, queryName } = scope)
	} {
		[query] = useQueryScope()
	}

	const type = obj?._type
	let endpoint: any
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
			break; case 'ImageMetadata': endpoint = api.endpoints.getImageMetadata
			break; case undefined: endpoint = undefined
			break; default: assertUnreachable(type)
	}

	if (obj) {
		const info = query(endpoint, obj, queryName)
		return info
	}
	return { data: undefined, isLoading: false }
}

export function useObjectIcon(objLookup: UniqueObjectLookup | null | undefined): { hasIcon: boolean | null, data: string | undefined, isLoading: boolean } {
	const [query] = useQueryScope()
	const queryName = 'useObjectIcon'
	const { data: obj, isLoading: objIsLoading } = useTowermodObject(objLookup ?? undefined, { query, queryName: 'useTowermodObject' })
	let imageId = null
	let hasIcon = null
	let imageIdLoading = false
	switch (obj?._type) {
		case 'ObjectType': {
			hasIcon = obj.pluginName === 'Sprite'
			void ({ data: imageId, isLoading: imageIdLoading } = query(api.endpoints.getObjectTypeImageId, obj.id, queryName))
		} break; case 'Container': {
			({ data: imageId, isLoading: imageIdLoading } = query(api.endpoints.getObjectTypeImageId, obj.id, queryName))
		} break; case 'Behavior': {
			({ data: imageId, isLoading: imageIdLoading } = query(api.endpoints.getObjectTypeImageId, obj.objectTypeId, queryName))
		} break; case 'ObjectInstance': {
			({ data: imageId, isLoading: imageIdLoading } = query(api.endpoints.getObjectInstanceImageId, obj.id, queryName))
		} break; case 'ImageMetadata': {
			imageId = obj.id
		} break; case 'Animation': {
			const { data: animation, isLoading } = query(api.endpoints.getAnimation, { id: obj.id }, queryName)
			imageIdLoading = isLoading
			if (animation) {
				const a = animation.isAngle ? animation : animation.subAnimations[0]
				imageId = a.frames[0]?.imageId
			}
		}
	}
	hasIcon = hasIcon || imageId != null
	const { currentData: img, isFetching: urlLoading } = api.useGetGameImageUrlQuery(imageId ?? skipToken)
	return { data: img?.url ?? undefined, hasIcon, isLoading: objIsLoading || imageIdLoading || urlLoading }
}


export function getObjectDisplayName(obj: UniqueTowermodObject) {
	const typeName = obj._type
	switch (typeName) {
		case 'Layout':
			return `Layout: ${obj.name}`
		case 'LayoutLayer':
			return `Layer ${obj.id}: ${obj.name}`
		case 'ObjectInstance': {
			// TODO: stamp type name and plugin name on instances from backend
			return `Instance: ${obj.id}`
		} case 'Animation':
			if (obj.isAngle) {
				return `Angle ${obj.angle}°`
			}
			return `Animation: ${obj.name}`
		case 'Behavior':
			return `Behavior: ${obj.name}`
		case 'Container':
			// TODO: stamp object type name on containers from backend
			return `Container: ${obj.id}`
		case 'Family':
			return `Family: ${obj.name}`
		case 'ObjectType': {
			if (obj.pluginName === 'Sprite') {
				return obj.name
			} else {
				return `${obj.name} (${obj.pluginName})`
			}
		} case 'ObjectTrait':
			return `Trait: ${obj.name}`
		case 'ImageMetadata':
			return `Image: ${obj.id}`
		case 'AppBlock':
			return 'Project Settings'
		default:
			assertUnreachable(typeName)
	}
}

// TODO: eliminate
export function useObjectDisplayName(objLookup: UniqueObjectLookup | null | undefined): string | undefined {
	const { data: obj } = useTowermodObject(objLookup ?? undefined)

	let objTypeId
	let pluginId
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
		case 'ObjectInstance': {
			if (!objType || !plugin) { return }
			const pluginName = plugin.stringTable.name
			const objectName = objType.name
			return `Instance: ${pluginName} (${objectName}: ${obj.id})`
		} case 'Animation':
			if (obj.isAngle) {
				return `Angle ${obj.angle}°`
			}
			return `Animation: ${obj.name}`
		case 'Container':
			if (!objType) { return }
			return `Container: ${objType.name}`
		default:
			return getObjectDisplayName(obj)
	}
}

export function fetchRtk<TEndpointName extends keyof typeof api.endpoints>(
	endpointName: TEndpointName, ...args: Parameters<typeof api.endpoints[TEndpointName]['initiate']>
):
	typeof api.endpoints[TEndpointName] extends ApiEndpointQuery<QueryDefinition<any, any, any, infer TResult, any>, any> ? Promise<TResult>
		: typeof api.endpoints[TEndpointName] extends ApiEndpointMutation<MutationDefinition<any, any, any, infer TResult, any>, any> ? Promise<TResult>
			: never
{
	// @ts-ignore
	return awaitRtk(dispatch(api.endpoints[endpointName].initiate(...args)))
}

export function useFileUrl(path: string | null | undefined): string | undefined {
	const { data: blob } = api.useGetFileQuery(path)
	const href = useObjectUrl(blob)
	return href ?? undefined
}

