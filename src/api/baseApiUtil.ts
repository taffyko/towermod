import { fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseEndpointDefinition, BaseQueryFn, FetchArgs, FetchBaseQueryError, FetchBaseQueryMeta } from '@reduxjs/toolkit/query'

export type MaybePromise<T> = Promise<T> | T;

export type CustomBaseQueryArgs = FetchArgs | Promise<any>
export type CustomBaseQueryError = FetchBaseQueryError
export type CustomBaseQueryMeta = FetchBaseQueryMeta

export const customBaseQuery: BaseQueryFn<string | CustomBaseQueryArgs, unknown, CustomBaseQueryError, {}, CustomBaseQueryMeta> =
async (args, api, extraOptions) => {
	if (args instanceof Promise) {
		try {
			let data: unknown = await args
			return { data }
		} catch (e) {
			console.error(e)
			return { error: e as any }
		}
	} else {
		const baseResult = await fetchBaseQuery({ baseUrl: "/" })(
			args,
			api,
			extraOptions
		);
		return baseResult
	}
};
type CustomBaseQueryFn = typeof customBaseQuery
type QueryFn<ResultType, QueryArg> = Exclude<BaseEndpointDefinition<QueryArg, CustomBaseQueryFn, ResultType>['queryFn'], undefined>

export function queryFn<ResultType, QueryArg>(fn: (arg: QueryArg) => Promise<ResultType>): QueryFn<ResultType, QueryArg> {
	return async (arg) => {
		try {
			let data: ResultType = await fn(arg)
			return {
				data,
			}
		} catch (e) {
			console.error(e)
			return {
				error: e as any,
				data: undefined as ResultType
			}
		}
	}
}
