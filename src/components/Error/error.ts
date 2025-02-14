import { openModal } from "@/app/Modal";
import { toast } from "@/app/Toast";
import { ErrorModal } from "./ErrorModal";
import React from 'react';

type MaybePromise<T> = Promise<T> | T;

export interface QueryErrorInfo {
	isError?: boolean,
	error?: any,
}

export function renderError(error: any): string {
	let content;
	if (error && typeof error === 'object' && 'errorChain' in error) {
		// Tauri error
		content = error.errorChain.join('\n');
		if ('backtrace' in error) {
			content += '\n' + error.backtrace;
		}
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
	openModal(React.createElement(ErrorModal, { error }))
}

export async function throwOnError<T extends MaybePromise<QueryErrorInfo>>(info: T) {
	const { isError, error } = await info;
	if (isError || (isError === undefined && error !== undefined)) {
		throw error
	}
	return info
}

export async function toastResult(info: MaybePromise<QueryErrorInfo>, successMsg?: string) {
	const { isError, error } = await info;
	if (isError || (isError === undefined && error !== undefined)) {
		toast(renderError(error), { type: 'error' })
	} else if (successMsg) {
		toast(successMsg)
	}
}
