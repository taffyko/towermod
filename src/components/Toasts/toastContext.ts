import React from "react"

export interface ToastContextState {
	toast(message: React.ReactNode): void
	close(i: number): void
}

export const ToastContext = React.createContext<ToastContextState>({
	toast: () => {},
	close: () => {},
})
