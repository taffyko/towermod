import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { ModInfo } from "@towermod";

export interface SliceState {
  modList: ModInfo[],
}

const initialState: SliceState = {
  modList: [],
}

export const slice = createSlice({
  name: "main",
  initialState,
  reducers: {
    setModList(state, { payload }: PayloadAction<ModInfo[]>) {
      state.modList = payload;
    },
    setActiveGame(state) {
    },
    setActiveProject(state) {
    },
  },
});
export const reducer = slice.reducer;
export const actions = slice.actions;
