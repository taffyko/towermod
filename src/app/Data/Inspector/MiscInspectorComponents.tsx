import { ObjectType, int } from "@towermod";
import { ArrayPropertyInfo } from "./base/inspectorUtil";
import { api } from "@/api";
import { lazy } from 'react'
import { skipToken } from "@reduxjs/toolkit/query";
import { IdLink } from "./IdLink";
import { UniqueObjectLookup } from "@/util";


const InspectorArray = lazy(() => import('./base/Inspector').then(m => ({ default: m.InspectorArray })))

export function ObjectInstances(props: { objectType: ObjectType }) {
	const { objectType } = props
	const { data: instances } = api.useGetObjectTypeInstancesQuery(objectType?.id ?? skipToken)
	return <IdLinkArray lookups={instances ?? []} />
}

export function IdLinkArray(props: { lookups: UniqueObjectLookup[], onChange?: (v: UniqueObjectLookup[]) => void }) {
	const { lookups, onChange } = props

	const pinfo: ArrayPropertyInfo<UniqueObjectLookup> = {
		key: 'root',
		custom: true,
		type: 'Array',
		fixed: !onChange,
		readonly: !onChange,
		value: lookups,
	}
	return <InspectorArray pinfo={pinfo} getValueComponent={(pinfo) => <IdLink lookup={pinfo.value as unknown as UniqueObjectLookup} />}/>
}

export function ColorPicker(props: { value: int, onChange: (v: int) => void }) {
	// TODO
}
