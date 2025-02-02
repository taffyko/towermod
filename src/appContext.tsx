import React from "react";
import { DataHandle } from "./components/Data";
import { TabsHandle } from "./components/Tabs";

export interface AppContextState {
	data: DataHandle | null,
	tabs: TabsHandle | null,
}

export const AppContext = React.createContext<AppContextState | null>(null)
