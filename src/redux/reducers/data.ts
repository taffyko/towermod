import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { AppBlock, Behavior, Container, CstcData, Family, Layout, LayoutLayer, ObjectInstance, ObjectTrait, ObjectType, Animation, AnimationFrame, FeatureDescriptor, FeatureDescriptors, PrivateVariable, ImageMetadata, ActionPoint, DataKey, BehaviorControl, GlobalVariable } from "@towermod";
// import { PrivateVariableType } from "@towermod";
import { appActions as appActions } from './app'
import { addRawReducers, assert, assertUnreachable, unwrap } from "@/util/util";

export type DataState = CstcData

const initialState: DataState = {
	appBlock: null as any,
	editorPlugins: {},
	layouts: [],
	objectTypes: [],
	behaviors: [],
	traits: [],
	families: [],
	containers: [],
	animations: [],
}

export function findObjectById(state: DataState, id: number) {
	for (const layout of state.layouts) {
		for (const layer of layout.layers) {
			for (const object of layer.objects) {
				if (object.id === id) { return object }
			}
		}
	}
	return assert(false)
}
export function findObjectTypeById(state: DataState, id: number) {
	return unwrap(state.objectTypes.find(s => id === s.id))
}

export function findLayoutByName(state: DataState, name: string) {
	return state.layouts.find(s => s.name === name)
}
export function findLayoutLayerById(state: DataState, id: number) {
	for (const layout of state.layouts) {
		for (const layer of layout.layers) {
			if (layer.id === id) { return layer }
		}
	}
	return assert(false)
}
export function findAnimationById(state: DataState, id: number) {
	function recurse(animations: Animation[]): Animation | undefined {
		for (const a of animations) {
			if (a.id === id) {
				return a
			}
			const result = recurse(a.subAnimations);
			if (result) {
				return result
			}
		}
		return undefined
	}
	return assert(recurse(state.animations))
}
export function findContainerByFirstObjectId(state: DataState, id: number) {
	return assert(state.containers.find(c => c.objectIds[0] === id))
}
export function findBehaviorByObjectTypeAndIdx(state: DataState, objectTypeId: number, idx: number) {
	return assert(state.behaviors.find(b => b.objectTypeId === objectTypeId && b.movIndex === idx))
}
export function findFamilyByName(state: DataState, name: string) {
	return assert(state.families.find(b => b.name === name))
}
export function findObjectTraitByName(state: DataState, name: string) {
	return assert(state.traits.find(o => o.name === name))
}

export function findObjectInstances(state: DataState, objTypeId: number) {
	const objects: ObjectInstance[] = []
	for (const layout of state.layouts) {
		for (const layer of layout.layers) {
			for (const object of layer.objects) {
				if (object.objectTypeId === objTypeId) { objects.push(object) }
			}
		}
	}
	return objects
}

export type TowermodObject = Layout | LayoutLayer | ObjectInstance | Animation | Behavior | Container | Family | ObjectType | ObjectTrait | AppBlock | AnimationFrame | PrivateVariable | ImageMetadata | ActionPoint | DataKey | BehaviorControl | GlobalVariable

export const uniqueObjectTypes = new Set([
	'Layout', 'LayoutLayer', 'ObjectInstance', 'Animation', 'Behavior', 'Container', 'Family', 'ObjectType', 'ObjectTrait', 'AppBlock'
] as const)
export type UniqueObjectTypes = (typeof uniqueObjectTypes) extends Set<infer T> ? T : never
/** Towermod objects that possess unique IDs, making it possible to look them up */
export type UniqueTowermodObject = Extract<TowermodObject, { _type: UniqueObjectTypes }>
/** Minimum properties needed to lookup each object */
export type UniqueObjectLookup =
	Pick<Layout, '_type' | 'name'>
	| Pick<LayoutLayer, '_type' | 'id'>
	| Pick<ObjectInstance, '_type' | 'id'>
	| Pick<Animation, '_type' | 'id'>
	| Pick<Behavior, '_type' | 'movIndex' | 'objectTypeId'>
	| Pick<Container, '_type' | 'objectIds'>
	| Pick<Family, '_type' | 'name'>
	| Pick<ObjectType, '_type' | 'id'>
	| Pick<ObjectTrait, '_type' | 'name'>
	| Pick<AppBlock, '_type'>
export type ObjectForType<T extends TowermodObject['_type']> = Extract<TowermodObject, { _type: T }>
export type LookupForType<T extends UniqueObjectLookup['_type']> = Extract<UniqueObjectLookup, { _type: T }>


export function findObject<T extends UniqueObjectLookup>(state: DataState, obj: T): ObjectForType<T['_type']> {
	let target: any = null
	const type = obj._type;
	switch (type) {
		case 'ObjectInstance':
			target = findObjectById(state, obj.id)
		break; case 'ObjectType':
			target = findObjectTypeById(state, obj.id)
		break; case 'Layout':
			target = findLayoutByName(state, obj.name)
		break; case 'LayoutLayer':
			target = findLayoutLayerById(state, obj.id)
		break; case 'Animation':
			target = findAnimationById(state, obj.id)
		break; case 'Behavior':
			target = findBehaviorByObjectTypeAndIdx(state, obj.objectTypeId, obj.movIndex)
		break; case 'Container':
			target = findContainerByFirstObjectId(state, obj.objectIds[0])
		break; case 'Family':
			target = findFamilyByName(state, obj.name)
		break; case 'ObjectTrait':
			target = findObjectTraitByName(state, obj.name)
		break; case 'AppBlock':
			target = state.appBlock
		break; default:
			assertUnreachable(type)
	}
	return target
}


export const dataSlice = createSlice({
	name: "data",
	initialState,
	reducers: {
		setData(_state, _action: PayloadAction<DataState>) { /* stub */ },
		editObject(state, { payload }: PayloadAction<UniqueTowermodObject>) {
			const target = findObject(state, payload)
			if (target) { Object.assign(target, payload) }
		},
		addObjectType(state, { payload: pluginType }: PayloadAction<string>) {
			// TODO: automatically create/associate a new animation for Sprite objects
		},
		removeObjectType(state, { payload: objectTypeId }: PayloadAction<number>) {
			// TODO: confirm dialog
			// TODO: find references in event sheets
			// TODO: find ObjectTrait references
			// TODO: find Container references
			// TODO: find Family references
		},
		addObjectInstance(state, { payload: objectTypeId }: PayloadAction<{ objectTypeId: number, layoutLayerId: number }>) {
			// TODO
		},
		removeObjectInstance(state, { payload }: PayloadAction<LookupForType<'ObjectInstance'>>) {
			// TODO: do types need at least one instance?
		},
		addPrivateVariable(state, { payload }: PayloadAction<{ objectTypeId: number, prop: string, initialValue: string | number }>) {
			const { objectTypeId, prop, initialValue } = payload
			const type = findObjectTypeById(state, objectTypeId)
			if (type.privateVariables.find(o => o.name === prop)) {
				console.error(`Property ${prop} already exists`)
				return
			}
			const valueType = typeof initialValue === 'number' ? 0 : 1 // PrivateVariableType.Integer : PrivateVariableType.String
			type.privateVariables.push({ name: prop, valueType, _type: 'PrivateVariable' })
			const instances = findObjectInstances(state, objectTypeId)
			for (const instance of instances) {
				instance.privateVariables.push(String(initialValue))
			}
		},
		removePrivateVariable(state, { payload }: PayloadAction<{ objectTypeId: number, prop: string }>) {
			const { objectTypeId, prop } = payload
			const type = findObjectTypeById(state, objectTypeId)
			const propIdx = type.privateVariables.findIndex(o => o.name === prop)
			if (propIdx === -1) { return }
			type.privateVariables.splice(propIdx, 1)
			const instances = findObjectInstances(state, objectTypeId)
			for (const instance of instances) {
				instance.privateVariables.splice(propIdx, 1)
			}
			// TODO: confirmation dialog
		},
		editPrivateVariables(state, { payload }: PayloadAction<{ objectId: number, vars: Record<string, string | number> }>) {
			const { objectId, vars } = payload
			const instance = findObjectById(state, objectId)
			const type = findObjectTypeById(state, instance.objectTypeId)
			for (const key of Object.keys(vars)) {
				const propIdx = type.privateVariables.findIndex(o => o.name === key)
				if (propIdx !== -1) {
					instance.privateVariables[propIdx] = String(vars[key])
				}
			}
		}
	},
});

// needlessly using immer to replace very large objects was causing blocking in excess of >1000ms
addRawReducers(dataSlice, {
	setData: (_state, action) => {
		return action.payload
	},
})
export const dataReducer = dataSlice.reducer;
export const dataActions = dataSlice.actions;

