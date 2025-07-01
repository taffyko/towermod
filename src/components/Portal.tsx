import { createPortal } from "react-dom"

export function Portal(props: { children: React.ReactNode, parent?: Element | DocumentFragment | null }) {
	if (props.parent) {
		return createPortal(props.children, props.parent)
	}
}
