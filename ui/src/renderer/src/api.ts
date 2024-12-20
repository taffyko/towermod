import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { int } from '@shared/util';
import { rpc } from './util';
import type { State } from '@shared/reducers'

export const api = createApi({
	reducerPath: 'api',
	baseQuery: fetchBaseQuery({ baseUrl: '/api' }), // Base URL for API calls
	endpoints: (builder) => ({
		getImage: builder.query({
			async queryFn(id: int, api) {
				const state = api.getState()
				console.log("STATE", state) // FIXME
				const arrayBuffer = await rpc.getImage(id)
				let blob: Blob | null = null
				if (arrayBuffer) {
					blob = new Blob([arrayBuffer], { type: 'image/png' })
				}
				return {
					data: blob
				}
			},
		})
	}),
});
