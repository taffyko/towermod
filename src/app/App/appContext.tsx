import React from "react";
import type { DataHandle } from "@/app/Data";
import type { TabsHandle } from "@/app/Tabs";
import { ModsHandle } from "@/app/Mods";
import { MiniEvent } from "@/util";

export interface AppContextState {
	data: DataHandle | null,
	tabs: TabsHandle | null,
	mods: ModsHandle | null,
}

export const AppContext = React.createContext<AppContextState | null>(null)

export const appContextStore = new MiniEvent<AppContextState | null>(null);
