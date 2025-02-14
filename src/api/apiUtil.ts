import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseEndpointDefinition } from '@reduxjs/toolkit/query'


type FetchBaseQueryFn = ReturnType<typeof fetchBaseQuery>
type CustomBaseQueryFn = FetchBaseQueryFn
// type CustomBaseQueryFn = BaseQueryFn<string, unknown, unknown, {}, {}>;
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
			}
		}
	}
}
