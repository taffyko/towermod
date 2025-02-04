import React from "react";
import { ErrorInfo } from "react";
import { toast } from "@/app/Toast";
import Style from './ErrorBoundary.module.scss';

export class ErrorBoundary extends React.Component<React.PropsWithChildren> {
	state: { error: any } = {
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
				{this.state.error.stack}
			</pre>
		} else {
			return this.props.children;
		}
	}
}
