import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { Game, ModInfo, Project, CstcData } from "@towermod";
import { actions as mainActions } from './main'
import { addRawReducers } from "@shared/util";

const initialState: CstcData = {
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

export const slice = createSlice({
	name: "data",
	initialState,
	reducers: {
		setData(_state, _action: PayloadAction<CstcData>) { /* stub */ }
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

