import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { Game, ModInfo, Project, CstcData } from "@towermod";
import { actions as mainActions } from './main'

const initialState: CstcData = {
	editorPlugins: {},
	layouts: [],
	imageBlock: [],
}

export const slice = createSlice({
	name: "data",
	initialState,
	reducers: {
		setData(state, { payload }: PayloadAction<CstcData>) {
			Object.assign(state, payload)
		}
	},
	extraReducers(builder) {
		builder.addCase(mainActions.setActiveGame, (state) => {
			// clear data
			Object.assign(state, initialState)
		})
		builder.addCase(mainActions.setActiveProject, (state) => {
			// clear data
			Object.assign(state, initialState)
		})
	},
});
export const reducer = slice.reducer;
export const actions = slice.actions;

