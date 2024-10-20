import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { Game, ModInfo, Project } from "@towermod";

export interface SliceState {
  modList: ModInfo[],
  game: Game | null,
  project: Project | null,
}

const initialState: SliceState = {
  modList: [],
  game: null,
  project: null,
}

export const slice = createSlice({
  name: "main",
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
export const reducer = slice.reducer;
export const actions = slice.actions;
