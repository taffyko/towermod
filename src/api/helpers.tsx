import { DefaultError, Query, QueryCache, QueryClient, QueryFunctionContext, QueryKey, UseMutationOptions, UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query'
import { MaybePromise } from "./baseApiUtil"
import { renderError } from '@/components/Error'
import { toast } from '@/app/Toast'
import { MiniEvent } from '@/util'
import { capitalize, isEqual } from 'lodash-es'

export interface QueryErrorInfo {
	isError?: boolean,
	error?: any,
}

export async function awaitRtk<T>(info: MaybePromise<QueryErrorInfo & { data?: T }> & { unsubscribe?: () => void }): Promise<T> {
	const { isError, error, data } = await info
	info.unsubscribe?.() // do not cause data from manual dispatch to be held in the cache forever
	if (isError || (isError === undefined && error !== undefined)) {
		throw error
	}
	return data as T
}

export async function toastResult(info: MaybePromise<QueryErrorInfo>, successMsg?: string) {
	const { isError, error } = await info
	if (isError || (isError === undefined && error !== undefined)) {
		toast(renderError(error), { type: 'error' })
	} else if (successMsg) {
		toast(successMsg)
	}
}


export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: Infinity
		}
	}
})

queryClient.getQueryCache().subscribe((e) => {
	if (e.type === 'removed') {
		queryEvicted.fire(e.query)
	}
})
export const queryEvicted = new MiniEvent<Query<any, any, any, any>>()

export function whenQueryEvicted(queryKey: QueryKey) {
	return new Promise<void>((resolve) => {
		const unsub = queryEvicted.subscribe((query) => {
			if (isEqual(query.queryKey, queryKey)) {
				unsub()
				resolve()
			}
		})
	})
}

export function createQuery<
	TName extends string,
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
	TArg = void
>(
	name: TName,
	baseOptions: CreateQueryOptions<TQueryFnData, TError, TData, TQueryKey, TArg>
) {
	function getOptions(arg: TArg): UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> {
		if (typeof baseOptions === 'function') {
			return baseOptions(arg)
		} else {
			return {
				...baseOptions,
				queryFn: baseOptions.queryFn.bind(null, arg),
				queryKey: typeof baseOptions.queryKey === 'function' ? baseOptions.queryKey(arg) : baseOptions.queryKey
			}
		}
	}

	function useQueryHook(arg: TArg, optionsOverrides?: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryFn' | 'queryKey'>) {
		const options = { ...getOptions(arg), ...optionsOverrides }
		return useQuery(options)
	}
	function fetchQuery(arg: TArg, optionsOverrides?: { staleTime?: 10000 }): Promise<TData> {
		const options = getOptions(arg)
		return queryClient.fetchQuery({
			queryKey: options.queryKey,
			queryFn: options.queryFn,
			...optionsOverrides
		})
	}
	const hookName = `use${capitalize(name)}` as `use${Capitalize<TName>}`
	return { [name]: fetchQuery, [hookName]: useQueryHook } as const
}

/** Spinoff of UseQueryOptions where either:
 1. `queryFn` and `queryKey` are functions that take the query arg as a parameter.
 2. Options are instead a function that takes a query arg and returns an options object.
 */
type CreateQueryOptions<
	TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey, TArg = void
> =
	(
		Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryFn' | 'queryKey'>
		& {
			queryFn: (arg: TArg, context: QueryFunctionContext<TQueryKey, never>) => TQueryFnData | Promise<TQueryFnData>
			queryKey: TQueryKey | ((arg: TArg) => TQueryKey)
		}
	)
	| ((arg: TArg) => UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>)

export function createMutation<
	TName extends string,
	TData = unknown,
	TError = DefaultError,
	TVariables = void,
	TContext = unknown,
>(
	name: TName,
	options: UseMutationOptions<TData, TError, TVariables, TContext>
) {
	function useMutationHook(optionsOverrides?: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'queryFn'>) {
		return useMutation({ ...options, ...optionsOverrides })
	}
	function fetchMutation(arg: TVariables) {
		const mutation = queryClient.getMutationCache().build(queryClient, options)
		return mutation.execute(arg)
	}

	const hookName = `use${capitalize(name)}` as `use${Capitalize<TName>}`
	return { [name]: fetchMutation, [hookName]: useMutationHook } as const
}

export function invalidate(...keys: QueryKey[]) {
	for (const key of keys) {
		queryClient.invalidateQueries({ queryKey: key })
	}
}
