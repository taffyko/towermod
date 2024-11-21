import { PayloadAction, createSelectorCreator, createSlice } from "@reduxjs/toolkit";
import { AppBlock, Behavior, Container, CstcData, Family, Layout, LayoutLayer, ObjectInstance, ObjectTrait, ObjectType, Animation, AnimationFrame } from "@towermod";
import { actions as mainActions } from './main'
import { addRawReducers, assertUnreachable } from "@shared/util";

type State = CstcData

const initialState: State = {
	editorPlugins: {},
	layouts: [],
	imageBlock: [],
	objectTypes: [],
	behaviors: [],
	traits: [],
	families: [],
	containers: [],
	animations: [],
}

export function findObjectById(state: State, id: number) {
	for (const layout of state.layouts) {
		for (const layer of layout.layers) {
			for (const object of layer.objects) {
				if (object.id === id) { return object }
			}
		}
	}
	return undefined
}
export function findObjectTypeById(state: State, id: number) {
	return state.objectTypes.find(s => id === s.id)
}

export function findLayoutByName(state: State, name: string) {
	return state.layouts.find(s => s.name === name)
}
export function findLayoutLayerById(state: State, id: number) {
	for (const layout of state.layouts) {
		for (const layer of layout.layers) {
			if (layer.id === id) { return layer }
		}
	}
	return undefined
}
export function findAnimationById(state: State, id: number) {
	return state.animations.find(a => a.id === id)
}
export function findContainerByFirstObjectId(state: State, id: number) {
	return state.containers.find(c => c.objectIds[0] === id)
}
export function findBehaviorByName(state: State, name: string) {
	return state.behaviors.find(b => b.name === name)
}
export function findFamilyByName(state: State, name: string) {
	return state.families.find(b => b.name === name)
}
export function findObjectTraitByName(state: State, name: string) {
	return state.traits.find(o => o.name === name)
}

export type TowermodObject = Layout | LayoutLayer | ObjectInstance | Animation | Behavior | Container | Family | ObjectType | ObjectTrait | AppBlock | AnimationFrame

export const uniqueObjectTypes = new Set([
	'Layout', 'LayoutLayer', 'ObjectInstance', 'Animation', 'Behavior', 'Container', 'Family', 'ObjectType', 'ObjectTrait', 'AppBlock'
] as const)
export type UniqueObjectTypes = (typeof uniqueObjectTypes) extends Set<infer T> ? T : never
export type UniqueTowermodObject = Extract<TowermodObject, { type: UniqueObjectTypes }>


export function findObjectSelector<T extends UniqueTowermodObject>(state: State, obj: T): T {
	let target: any = null
	const type = obj.type;
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
			target = findBehaviorByName(state, obj.name)
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


export const slice = createSlice({
	name: "data",
	initialState,
	reducers: {
		setData(_state, _action: PayloadAction<State>) { /* stub */ },
		editObject(state, { payload }: PayloadAction<UniqueTowermodObject>) {
			const target = findObjectSelector(state, payload)
			if (target) { Object.assign(target, payload) }
		},
	},
});

// needlessly using immer to replace very large objects was causing blocking in excess of >1000ms
addRawReducers(slice, {
	setData: (_state, action) => {
		return action.payload
	},
	[mainActions.setActiveGame.type]: () => { return initialState },
	[mainActions.setActiveProject.type]: () => { return initialState },
})
export const reducer = slice.reducer;
export const actions = slice.actions;

