import { MiniEvent, useMiniEventValue } from "@/util"
import React from "react"

const openModalsChanged = new MiniEvent<number>(0)

export function useIsModalOpen() {
	return useMiniEventValue(openModalsChanged) > 0
}

export function incrementOpenModals() {
	openModalsChanged.fire(openModalsChanged.lastValue! + 1)
}

export function decrementOpenModals() {
	openModalsChanged.fire(openModalsChanged.lastValue! - 1)
}

export const ModalContext = React.createContext(false)
