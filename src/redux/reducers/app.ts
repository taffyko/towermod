import { UniqueObjectLookup, posmod } from "@/util";
import { PayloadAction, createDraftSafeSelector, createSelector, createSlice } from "@reduxjs/toolkit";
import { Game, ModInfo, Project } from "@towermod";

const MAX_OUTLINER_HISTORY = 50

export interface AppState {
	allTabs: string[]
	enabledTabsUnordered: string[]
	currentTab: string
	selectedModId: string | undefined,
	runningMods: string[],
	outlinerValue: UniqueObjectLookup | undefined,
	outlinerHistory: UniqueObjectLookup[],
	outlinerHistoryIdx: number,
	showImageCollisionPreview: boolean,
	imageId: number,
}

const initialState: AppState = {
	allTabs: ['Config', 'Mods', 'Images', 'Data', 'Events'],
	enabledTabsUnordered: ['Config'],
	currentTab: 'Config',
	selectedModId: undefined,
	runningMods: [],
	outlinerValue: undefined,
	outlinerHistory: [],
	outlinerHistoryIdx: 0,
	showImageCollisionPreview: true,
	imageId: 0,
}

const selectTabsInternal = createDraftSafeSelector([
	(s: AppState) => s.allTabs,
	(s: AppState) => s.enabledTabsUnordered,
], (allTabs, enabledTabs) =>
	allTabs.filter(t => enabledTabs.includes(t))
)

export const selectTabs = createSelector(s => s.app, selectTabsInternal)

export const appSlice = createSlice({
	name: "app",
	initialState,
	reducers: {
		nextTab(state, action: PayloadAction<number>) {
			const { payload: offset } = action
			const tabs = selectTabsInternal(state)
			let tabIdx = tabs.indexOf(state.currentTab) + offset
			tabIdx = posmod(tabIdx, tabs.length)
			state.currentTab = tabs[tabIdx]
		},
		setCurrentTab(state, action: PayloadAction<string>) {
			const tab = action.payload;
			const tabs = selectTabsInternal(state)
			if (tabs.includes(tab)) {
				state.currentTab = tab;
			}
		},

		setTabEnabled(state, action: PayloadAction<{ tab: string, enabled: boolean }>) {
			const { tab, enabled } = action.payload;
			const isTabEnabled = state.enabledTabsUnordered.includes(tab);
			if (enabled && !isTabEnabled) {
				state.enabledTabsUnordered.push(tab);
			} else if (!enabled && isTabEnabled) {
				state.enabledTabsUnordered = state.enabledTabsUnordered.filter((enabledTab) => enabledTab !== tab);
				if (state.currentTab === tab) {
					state.currentTab = state.enabledTabsUnordered[0];
				}
			}
		},

		selectMod(state, action: PayloadAction<string | undefined>) {
			state.selectedModId = action.payload;
		},
		setModRunning(state, action: PayloadAction<{ modId: string, running: boolean }>) {
			const { modId, running } = action.payload;
			if (running) {
				state.runningMods.push(modId);
			} else {
				state.runningMods = state.runningMods.filter((runningMod) => runningMod !== modId);
			}
		},

		setOutlinerValue(state, action: PayloadAction<UniqueObjectLookup | undefined>) {
			state.outlinerValue = action.payload
			if (action.payload) {
				if (state.outlinerHistoryIdx === -1) { state.outlinerHistoryIdx = state.outlinerHistory.length - 1 }
				state.outlinerHistory = state.outlinerHistory.slice(0, state.outlinerHistoryIdx + 1) // slice off the future
				state.outlinerHistory.push(action.payload)
				if (state.outlinerHistory.length > MAX_OUTLINER_HISTORY) {
					state.outlinerHistory.shift()
				} else {
					state.outlinerHistoryIdx += 1
				}
			} else {
				state.outlinerHistoryIdx = -1
			}
		},
		outlinerHistoryNext(state, action: PayloadAction<number>) {
			if (state.outlinerHistoryIdx === -1) { state.outlinerHistoryIdx = (state.outlinerHistory.length - 1) - 1 * Math.sign(action.payload)}
			state.outlinerHistoryIdx = posmod(state.outlinerHistoryIdx + action.payload, state.outlinerHistory.length)
			state.outlinerValue = state.outlinerHistory[state.outlinerHistoryIdx]
		},
		setShowImageCollisionPreview(state, action: PayloadAction<boolean>) {
			state.showImageCollisionPreview = action.payload;
		},

		setImageId(state, action: PayloadAction<number>) {
			state.imageId = action.payload;
		},
	},
});
export const appReducer = appSlice.reducer;
export const appActions = appSlice.actions;
