import { MaybePromise } from "./baseApiUtil";
import { renderError } from '@/components/Error'
import { toast } from '@/app/Toast'

export interface QueryErrorInfo {
	isError?: boolean,
	error?: any,
}

export async function awaitRtk<T>(info: MaybePromise<QueryErrorInfo & { data?: T }>): Promise<T> {
	const { isError, error, data } = await info;
	if (isError || (isError === undefined && error !== undefined)) {
		throw error
	}
	return data as T
}

export async function toastResult(info: MaybePromise<QueryErrorInfo>, successMsg?: string) {
	const { isError, error } = await info;
	if (isError || (isError === undefined && error !== undefined)) {
		toast(renderError(error), { type: 'error' })
	} else if (successMsg) {
		toast(successMsg)
	}
}
