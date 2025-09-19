import { Suspense } from "react"

export function SuspenseSpinner(props: { children: React.ReactNode }) {
	return <Suspense fallback="Loading...">
		{props.children}
	</Suspense>
}