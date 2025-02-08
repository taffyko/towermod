import React from "react";
import { ErrorInfo } from "react";
import { showError, ErrorMsg } from "@/components/Error";

export class ErrorBoundary extends React.Component<React.PropsWithChildren> {
	state: { error: any } = {
		error: undefined
	}

	private promiseRejectionHandler = (event: PromiseRejectionEvent) => {
		showError(event.reason)
	}

	componentDidMount() {
		window.addEventListener('unhandledrejection', this.promiseRejectionHandler)
	}

	componentWillUnmount() {
		window.removeEventListener('unhandledrejection', this.promiseRejectionHandler)
	}

	static getDerivedStateFromError(error: any) {
		return { error }
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error('Uncaught error:', error, errorInfo);
	}

	render() {
		if (this.state.error) {
			return <div style={{ padding: 'var(--gap-m)' }}>
				<ErrorMsg error={this.state.error} />
			</div>
		} else {
			return this.props.children;
		}
	}
}
