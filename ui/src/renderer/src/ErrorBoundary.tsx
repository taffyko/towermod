import React from "react";
import { ErrorInfo } from "react";

export class ErrorBoundary extends React.Component<React.PropsWithChildren> {
  private promiseRejectionHandler = (event: PromiseRejectionEvent) => {
    // TODO: error toast
    event.preventDefault()
  }

  componentDidMount() {
    window.addEventListener('unhandledrejection', this.promiseRejectionHandler)
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.promiseRejectionHandler)
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    return this.props.children;
  }
}
