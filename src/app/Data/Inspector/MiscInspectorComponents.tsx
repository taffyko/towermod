import { ObjectInstance, ObjectType, SpriteObjectData, int } from "@towermod"
import { ArrayPropertyInfo } from "./base/inspectorUtil"
import api from "@/api"
import { lazy } from 'react'
import { IdLink } from "./IdLink"
import { UniqueObjectLookup } from "@/util"
import { skipToken } from "@tanstack/react-query"


const InspectorArray = lazy(() => import('./base/Inspector').then(m => ({ default: m.InspectorArray })))
const InspectorObject = lazy(() => import('./base/Inspector').then(m => ({ default: m.InspectorObject })))

export function ObjectInstances(props: { objectType: ObjectType }) {
	const { objectType } = props
	const { data: instances } = api.getObjectTypeInstances.useQuery(objectType?.id ?? skipToken)
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

export function EditAnimations(props: {
	objectInstance: ObjectInstance<SpriteObjectData>
}) {
	const { objectInstance } = props
	const { data: anim } = api.getTowermodObject.useQuery({ _type: 'Animation', id: objectInstance.data.animation })
	return anim ? <InspectorObject value={anim} onChange={() => {}} /> : null
}
