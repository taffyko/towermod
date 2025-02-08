import { ErrorMsg } from "./ErrorMsg";
import { openModal } from "@/app/Modal";
import { toast } from "@/app/Toast";
import { ErrorModal } from "./ErrorModal";

type MaybePromise<T> = Promise<T> | T;

export interface QueryErrorInfo {
	isError?: boolean,
	error?: any,
}

export function renderError(error: any): string {
	let content;
	if (error && typeof error === 'object' && 'errorChain' in error) {
		// Tauri error
		content = error.errorChain.join('\n')
	} else if (error instanceof Error) {
		content = error.stack || String(error)
	} else if (typeof content === 'object') {
		content = JSON.stringify(error, null, 4)
	} else {
		content = String(error)
	}
	return content
}

export function showError(error: any) {
	openModal(
		<ErrorModal error={error} />
	)
}

export async function toastResult(info: MaybePromise<QueryErrorInfo>, successMsg?: string) {
	const { isError, error } = await info;
	if (isError || (isError === undefined && error !== undefined)) {
		toast(renderError(error), { type: 'error' })
	} else if (successMsg) {
		toast(successMsg)
	}
}
