import { showError } from '@/components/Error'
import { iterWrap, MiniEvent } from '@/util'
import { DefaultError, Query, QueryClient, QueryFunctionContext, QueryKey, SkipToken, StaleTime, UseMutationOptions, UseQueryOptions, UseSuspenseQueryOptions, hashKey, notifyManager, skipToken, useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { isEqual } from 'lodash-es'

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
	function getOptions(arg: TArg | SkipToken, additionalOpts?: AdditionalOpts): UseSuspenseQueryOptions<TQueryFnData, TError, TData> {
		if (arg === skipToken) {
			return { queryFn: skipToken, queryKey: ['null'], meta: {} } as any
		}
		const options: any = { ...baseOptions, queryFn: baseOptions.queryFn.bind(null, arg), ...additionalOpts }
		const queryFn = options.queryFn
		options.queryKey = fetchQuery.queryKey(arg)
		const queryHash = hashKey(options.queryKey)
		const cache = queryClient.getQueryCache()

		// first, get initial deps (run deps function without the result data
		let newDeps = (typeof options.deps === 'function' ? options.deps(arg) : options.deps) || []

		// first-time initialization of meta
		const query = cache.get(queryHash)
		options.meta = query?.meta || { deps: newDeps, parents: new Set<string>() }

		// if a parent query passed along its hash, add it to this query's parents set
		if (options.parent) {
			const parents = options.meta.parents as Set<string>
			parents.add(options.parent)
		}

		options.queryFn = async (baseContext: QueryFunctionContext<any, never>) => {
			const context = { ...baseContext, hash: queryHash }
			// Fetch data
			const data: TData = await queryFn(context)

			if (typeof options.deps === 'function') {
				// Re-run deps function (now that we have result data) to get more refined deps
				newDeps = options.deps(arg, data)
			}

			const query = cache.get(queryHash)
			if (query) {
				if (query.meta) {
					// Update deps on this query's cache entry
					query.meta.deps = newDeps
					// Invalidate parent queries now the data has been fetched
					setTimeout(() => invalidateParentQueries(query), 0)
				} else {
					console.error('`meta` missing on query', query)
				}
			}
			return data
		}
		return options
	}

	/** Extra query options that can be passed at call-time */
	type AdditionalOpts = {
		staleTime?: StaleTime
		/** Hash of the parent query calling this query as a subquery */
		parent?: string
	}
	function useQueryHook(arg: TArg | SkipToken, optionsOverrides?: Omit<UseQueryOptions<TQueryFnData, TError, TData>, 'queryFn' | 'queryKey'> & AdditionalOpts) {
		const options = getOptions(arg, optionsOverrides)
		return useQuery(options)
	}
	function useSuspenseQueryHook(arg: TArg, optionsOverrides?: Omit<UseSuspenseQueryOptions<TQueryFnData, TError, TData>, 'queryFn' | 'queryKey'> & AdditionalOpts) {
		const options = getOptions(arg, optionsOverrides)
		return useSuspenseQuery(options)
	}
	async function fetchQuery(arg: TArg, optionsOverrides?: AdditionalOpts): Promise<TData> {
		const options = getOptions(arg, optionsOverrides)
		const query = getCacheEntry(arg)
		if (query && query.promise && !(query.state.fetchStatus === 'idle' && query.state.isInvalidated)) {
			// If a request is already in progress, do not trigger another one
			try {
				return await query.promise
			} catch {
				// But if the existing request gets cancelled, start a new one
				return await queryClient.fetchQuery(options) as Promise<TData>
			}
		}
		return await queryClient.fetchQuery(options) as Promise<TData>
	}
	function requestCache(arg: TArg, requestOnMiss = true): TData | undefined {
		const query = getCacheEntry(arg)
		if (query?.state.data !== undefined) {
			return query.state.data
		}
		if (requestOnMiss) { void fetchQuery(arg) }
		return undefined
	}
	function getCacheEntry(arg: TArg) {
		const queryHash = hashKey(fetchQuery.queryKey(arg))
		return queryClient.getQueryCache().get<TQueryFnData, TError, TData, QueryKey>(queryHash)
	}
	fetchQuery.queryName = crypto.randomUUID() as string
	fetchQuery.useQuery = useQueryHook
	fetchQuery.useSuspenseQuery = useSuspenseQueryHook
	fetchQuery.requestCache = requestCache
	fetchQuery.getCacheEntry = getCacheEntry
	fetchQuery.queryKey = (arg: TArg) => [fetchQuery.queryName, baseOptions.argToKey ? baseOptions.argToKey(arg) : arg] as QueryKey
	return fetchQuery
}

export type QueryDependency =
	{ type: string, id: unknown, with?: Record<string, boolean> } // item - (use { id: 'singleton' } for singleton types)
	| { type: string, with?: Record<string, boolean>, filter?: Record<string, unknown> } // list

/**
 * Spinoff of UseQueryOptions where `queryFn` and `deps` are functions that take the query arg as a parameter.
 */
type CreateQueryOptions<
	TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TArg = void
> =
	(
		Omit<UseQueryOptions<TQueryFnData, TError, TData, any>, 'queryFn' | 'queryKey'>
		& {
			queryFn: (arg: TArg, context: QueryFunctionContext<any, never> & CreateQueryContext) => TQueryFnData | Promise<TQueryFnData>
			/** The `deps` array refers to: "which models/records/resources on the server does this query's result depend on?" */
			deps?: QueryDependency[] | ((arg: TArg, result?: TData) => QueryDependency[])
			/** Useful if you want to strip extra properties so that they don't affect how args are hashed to create the cache key */
			argToKey?: (arg: TArg) => unknown
		}
	)
/** Special context object passed to queryFn of createQuery */
type CreateQueryContext = {
	readonly hash: string
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

export function invalidate(type: string, id: unknown | Iterable<unknown>, options?: { with?: Record<string, boolean>, excludeFilters?: Record<string, unknown> }) {
	const { with: targetPropertyGroups, excludeFilters } = options ?? {}
	const ids = iterWrap(id)
	const promises: Promise<unknown>[] = []
	promises.push(queryClient.invalidateQueries({ predicate: (query) => {
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
			if ('id' in dep) {
				let idMatched = false
				for (const id of ids) {
					if (id === 'all') {}
					else if (id === 'new') {
						// Invalidating with ID 'new' implies an item will be added with an ID that is not yet known.
						// Accordingly: Invalidate lists, and invalidate all item queries that have a null/undefined response in the cache.
						// (meaning that the item did not exist when the query was made, but might exist now)
						if (query.state.data != null) { continue }
					}
					else if (!isEqual(id, dep.id)) { continue }
					idMatched = true
					break
				}
				if (!idMatched) { continue loop }
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
			// invalidate parent queries when child queries are invalidated
			promises.push(invalidateParentQueries(query))
			return true
		}
		return false
	}}))
	return Promise.all(promises)
}

/** @internal set each query's `queryName` to its export name for better debugging */
export function setQueryNamesOnModule(mod: any) {
	for (const key in mod) {
		const member = mod[key]
		if (member && typeof member === 'function' && 'queryName' in member) {
			member.queryName = key
		}
	}
}

function invalidateQuery(query: Query) {
	return notifyManager.batch(() => {
		query.invalidate()
		if (!query.isDisabled() && !query.isStatic()) {
			const promise = query.fetch(undefined)
			return query.state.fetchStatus === 'paused'
				? Promise.resolve()
				: promise
		}
		return Promise.resolve()
	})
}

function invalidateParentQueries(query: Query) {
	const parents = query.meta?.parents as Set<string>
	const promises: Promise<unknown>[] = []
	if (parents.size) {
		const cache = queryClient.getQueryCache()
		for (const parentHash of parents as Set<string>) {
			const q = cache.get(parentHash)
			if (!q) { parents.delete(parentHash) }
			else { promises.push(invalidateQuery(q)) }
		}
	}
	return Promise.all(promises)
}
