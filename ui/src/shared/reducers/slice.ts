import { PayloadAction, createSlice } from "@reduxjs/toolkit";

export interface SliceState {
  count: number,
}

export const slice = createSlice({
  name: "main",
  initialState: { count: 0 } as SliceState,
  reducers: {
    changeCount(state, { payload }: PayloadAction<number>) {
      state.count += payload;
    },
    setActiveGame(state) {
    },
    setActiveProject(state) {
    },
  },
});
export const reducer = slice.reducer;
export const { changeCount, setActiveGame, setActiveProject } = slice.actions;
