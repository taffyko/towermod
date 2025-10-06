import { createPortal } from "react-dom"

export function Portal(props: { children: React.ReactNode, parent?: Element | DocumentFragment | null, fallthrough?: boolean }) {
	if (props.parent) {
		return createPortal(props.children, props.parent)
	} else if (props.fallthrough) {
		return props.children
	}
}
