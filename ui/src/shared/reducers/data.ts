import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { Game, ModInfo, Project } from "@towermod";
import { actions as mainActions } from './main'

export interface SliceState {
}

const initialState: SliceState = {
}

export const slice = createSlice({
	name: "data",
	initialState,
	reducers: {

	},
	extraReducers(builder) {
		builder.addCase(mainActions.setActiveGame, (state) => {
			// TODO clear data
		})
		builder.addCase(mainActions.setActiveProject, (state) => {
			// TODO clear dta
		})
	},
});
export const reducer = slice.reducer;
export const actions = slice.actions;

