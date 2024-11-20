import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { CstcData, ObjectInstance, ObjectType } from "@towermod";
import { actions as mainActions } from './main'
import { PartialExcept, addRawReducers } from "@shared/util";
import { WritableDraft } from "immer";

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

export function findObjectById(state: WritableDraft<State>, id: number): WritableDraft<ObjectInstance> | undefined
export function findObjectById(state: State, id: number): ObjectInstance | undefined {
	for (const layout of state.layouts) {
		for (const layer of layout.layers) {
			for (const object of layer.objects) {
				if (object.id === id) { return object }
			}
		}
	}
	return undefined
}

export function findObjectTypeById(state: WritableDraft<State>, id: number): WritableDraft<ObjectType> | undefined
export function findObjectTypeById(state: State, id: number): ObjectType | undefined {
	return state.objectTypes.find(s => id === s.id)
}


export const slice = createSlice({
	name: "data",
	initialState,
	reducers: {
		setData(_state, _action: PayloadAction<State>) { /* stub */ },
		updateObjectInstance(state, { payload }: PayloadAction<PartialExcept<ObjectInstance, 'id'>>) {
			const target = findObjectById(state, payload.id)
			if (target) { Object.assign(target, payload) }
		},
	},
});

// needlessly using immer to replace very objects was causing blocking in excess of >1000ms
addRawReducers(slice, {
	setData: (_state, action) => {
		return action.payload
	},
	[mainActions.setActiveGame.type]: () => { return initialState },
	[mainActions.setActiveProject.type]: () => { return initialState },
})
export const reducer = slice.reducer;
export const actions = slice.actions;

