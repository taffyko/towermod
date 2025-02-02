import React from "react";
import { ErrorInfo } from "react";
import { toast } from "react-toastify";
import Style from './ErrorBoundary.module.scss';

export class ErrorBoundary extends React.Component<React.PropsWithChildren> {
	state = {
		error: undefined
	}

	private promiseRejectionHandler = (event: PromiseRejectionEvent) => {
		toast(<code>{event.reason.toString()}</code>, { type: "error" })
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
			return <pre className={Style.errorBoundary}>
				{String(this.state.error)}
			</pre>
		} else {
			return this.props.children;
		}
	}
}
