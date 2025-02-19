import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { Game, ModInfo, Project } from "@towermod";

export interface AppState {
	modList: ModInfo[],
	game: Game | null,
	project: Project | null,
}

const initialState: AppState = {
	modList: [],
	game: null,
	project: null,
}

export const appSlice = createSlice({
	name: "app",
	initialState,
	reducers: {
		setModList(state, { payload }: PayloadAction<ModInfo[]>) {
			state.modList = payload;
		},
		setActiveGame(state, { payload }: PayloadAction<Game>) {
			state.game = payload
			state.project = null
		},
		setActiveProject(state, { payload }: PayloadAction<Project>) {
			state.project = payload
		},
	},
});
export const appReducer = appSlice.reducer;
export const appActions = appSlice.actions;
