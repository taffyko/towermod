import { showError } from '@/components/Error'
import { MiniEvent } from '@/util'
import { DefaultError, Query, QueryClient, QueryFunctionContext, QueryKey, SkipToken, StaleTime, UseMutationOptions, UseQueryOptions, UseSuspenseQueryOptions, skipToken, useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { isEqual } from 'lodash-es'

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: Infinity,
			throwOnError: (err) => {
				console.error(err)
				window.setTimeout(() => showError(err), 0)
				return false
			},
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
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TArg = void
>(
	baseOptions: CreateQueryOptions<TQueryFnData, TError, TData, TArg>
) {
	const queryName: string = crypto.randomUUID()
	function getOptions(arg: TArg | SkipToken): UseSuspenseQueryOptions<TQueryFnData, TError, TData> {
		if (arg === skipToken) {
			return { queryFn: skipToken, queryKey: ['null'] } as any
		}
		let options: any
		if (typeof baseOptions === 'function') {
			options = baseOptions(arg)
		} else {
			options = { ...baseOptions, queryFn: baseOptions.queryFn.bind(null, arg) }
		}
		const baseDeps = (typeof options.deps === 'function' ? options.deps(arg) : options.deps) || []
		const queryFn = options.queryFn
		options.queryKey = [queryName, arg]
		options.meta = { deps: baseDeps }
		options.queryFn = (baseContext: QueryFunctionContext<any, never>) => {
			const context = { ...baseContext, depsContext: [] }
			const data: TData = queryFn(arg, context)
			const parentDeps = baseOptions.depsContext ?? []
			let deps = baseDeps
			if (typeof options.deps === 'function') {
				// update deps using result
				deps = options.deps(arg, data)
			}
			deps.push(...context.depsContext)
			const meta = queryClient.getQueryCache().find({ queryKey: options.queryKey })?.meta || {}
			meta.deps = deps
			parentDeps.push(...deps)
			return data
		}
		return options
	}

	type AdditionalOpts = {
		staleTime?: StaleTime
		/**
		 * Used to help implement queries that call other queries.
		 * In the parent query's queryFn, pass context.depsContext to the callee query via this option.
		 * The deps from the callee query will be added to the parent query's deps.
		 */
		depsContext?: QueryDependency[]
	}
	function useQueryHook(arg: TArg | SkipToken, optionsOverrides?: Omit<UseQueryOptions<TQueryFnData, TError, TData>, 'queryFn' | 'queryKey'> & AdditionalOpts) {
		const options = { ...getOptions(arg), ...optionsOverrides }
		return useQuery(options)
	}
	function useSuspenseQueryHook(arg: TArg, optionsOverrides?: Omit<UseSuspenseQueryOptions<TQueryFnData, TError, TData>, 'queryFn' | 'queryKey'> & AdditionalOpts) {
		const options = { ...getOptions(arg), ...optionsOverrides }
		return useSuspenseQuery(options)
	}
	async function fetchQuery(arg: TArg, optionsOverrides?: AdditionalOpts): Promise<TData> {
		const options = getOptions(arg)
		const query = queryClient.getQueryCache().find<TData>({ queryKey: options.queryKey })
		if (query && query.promise) {
			// If a request is already in progress, do not trigger another one
			try {
				return await query.promise
			} catch {
				// But if the existing request gets cancelled, start a new one
				return await queryClient.fetchQuery({
					queryKey: options.queryKey,
					queryFn: options.queryFn,
					...optionsOverrides
				})
			}
		}
		return await queryClient.fetchQuery({
			queryKey: options.queryKey,
			queryFn: options.queryFn,
			...optionsOverrides
		})
	}
	function requestCache(arg: TArg, requestOnMiss = true): TData | undefined {
		const options = getOptions(arg)
		const query = queryClient.getQueryCache().find<TData>({ queryKey: options.queryKey })
		if (query?.state.data !== undefined) {
			return query.state.data
		}
		if (requestOnMiss) { void fetchQuery(arg) }
		return undefined
	}

	fetchQuery.useQuery = useQueryHook
	fetchQuery.useSuspenseQuery = useSuspenseQueryHook
	fetchQuery.requestCache = requestCache
	fetchQuery.queryKey = (arg: TArg) => [queryName, arg] as QueryKey
	return fetchQuery
}

export type QueryDependency =
	{ type: string, id: unknown, with?: Record<string, boolean> } // item - (use { id: 'singleton' } for singleton types)
	| { type: string, with?: Record<string, boolean>, filter?: Record<string, unknown> } // list

/** Spinoff of UseQueryOptions where either:
 1. `queryFn` and ~~`queryKey`~~ `deps` are functions that take the query arg as a parameter.
 2. Options are instead a function that takes a query arg and returns an options object.

 The `deps` array refers to: "which models/records/resources on the server does this query's result depend on?"
 */
type CreateQueryOptions<
	TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TArg = void
> =
	(
		Omit<UseQueryOptions<TQueryFnData, TError, TData, any>, 'queryFn' | 'queryKey'>
		& {
			queryFn: (arg: TArg, context: QueryFunctionContext<any, never> & CreateQueryContext) => TQueryFnData | Promise<TQueryFnData>
			deps?: QueryDependency[] | ((arg: TArg, result?: TData) => QueryDependency[])
			depsContext?: QueryDependency[]
		}
	)
	| ((arg: TArg) => Omit<UseSuspenseQueryOptions<TQueryFnData, TError, TData, any>, 'queryKey'>) & { deps?: QueryDependency[], depsContext?: QueryDependency[] }
/** Special context object passed to queryFn of createQuery */
type CreateQueryContext = {
	/** Any deps pushed to this array by `queryFn` will be added to the query's `deps` */
	readonly depsContext: QueryDependency[]
}

export function createMutation<
	TData = unknown,
	TError = DefaultError,
	TVariables = void,
	TContext = unknown,
>(
	options: UseMutationOptions<TData, TError, TVariables, TContext>
) {
	function useMutationHook(optionsOverrides?: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'queryFn'>) {
		return useMutation({ ...options, ...optionsOverrides })
	}
	function fetchMutation(arg: TVariables) {
		const mutation = queryClient.getMutationCache().build(queryClient, options)
		return mutation.execute(arg)
	}
	fetchMutation.useMutation = useMutationHook
	return fetchMutation
}

const typeDependencyMap: Record<string, string[]> = {
	'Data': ['Game'],
	'Project': ['Game'],
	'ImageDump': ['Game'],
	'Layout': ['Data'],
	'LayoutLayer': ['Data'],
	'ObjectInstance': ['Data'],
	'Animation': ['Data'],
	'Behavior': ['Data'],
	'Container': ['Data'],
	'Family': ['Data'],
	'ObjectType': ['Data'],
	'ObjectTrait': ['Data'],
	'ImageMetadata': ['Data'],
	'AppBlock': ['Data'],
}

export function invalidate(type: string, id: unknown, options?: { with?: Record<string, boolean>, excludeFilters?: Record<string, unknown> }) {
	const { with: targetPropertyGroups, excludeFilters } = options ?? {}
	queryClient.invalidateQueries({ predicate: (query) => {
		const deps = (query.meta?.deps ?? []) as QueryDependency[]
		loop: for (const dep of deps) {
			if (dep.type !== type) {
				for (const parentType of typeDependencyMap[dep.type] ?? []) {
					// If invalidating a parent type, always invalidate all child types
					if (parentType === type) { return true }
				}
				continue loop
			}
			// If invalidating a specific item, ignore non-matching items
			// But still invalidate lists (no id in dep)
			if (id && 'id' in dep) {
				if (id === 'all') {}
				else if (id === 'new') {
					// Invalidating with ID 'new' implies an item will be added with an ID that is not yet known.
					// Accordingly: Invalidate lists, and invalidate all item queries that have a null/undefined response in the cache.
					// (meaning that the item did not exist when the query was made, but might exist now)
					if (query.state.data != null) { continue loop }
				}
				else if (!isEqual(id, dep.id)) { continue loop }
			}
			// If invalidating specific property groups of an object type,
			// ignore items where those property groups are specifically not included
			if (targetPropertyGroups && dep.with) {
				for (const [key, value] of Object.entries(targetPropertyGroups)) {
					if (!(key in dep.with) || dep.with[key] !== value) {
						continue loop
					}
				}
			}
			// If excluding certain list filters, ignore lists that match those filters
			if (excludeFilters && 'filter' in dep) {
				for (const [key, value] of Object.entries(excludeFilters)) {
					//@ts-ignore
					if (key in dep.filter && isEqual(value, dep.filter[key])) {
						continue loop
					}
				}
			}
			return true
		}
		return false
	}})
}
