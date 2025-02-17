import React from "react";
import type { DataHandle } from "@/app/Data";
import type { TabsHandle } from "@/app/Tabs";

export interface AppContextState {
	data: DataHandle | null,
	tabs: TabsHandle | null,
}

export const AppContext = React.createContext<AppContextState | null>(null)
