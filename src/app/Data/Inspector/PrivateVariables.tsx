import { useAppDispatch, useAppSelector } from "@/redux";
import { InspectorDictionary } from "./base/Inspector";
import { ArrayPropertyInfo, DictionaryPropertyInfo, SimplePropertyInfo } from "./base/inspectorUtil";
import { findObjectTypeById } from "@/redux";
import { ObjectInstance, PrivateVariable } from "@towermod";
import { actions } from "@/redux";
import { assert } from "@/util/util";
import { useMemo } from "react";

export function PrivateVariables(props: { pinfo: ArrayPropertyInfo<PrivateVariable> }) {
	const { pinfo } = props
	const dispatch = useAppDispatch()
	assert(pinfo.parent)
	const objPinfo = pinfo.parent as SimplePropertyInfo<ObjectInstance>
	const obj = objPinfo.value;

	const objType = useAppSelector(state => findObjectTypeById(state.data, obj.objectTypeId))

	const value = useMemo(() => {
		const dict: Record<string, string | number> = {}
		obj.privateVariables.forEach((val, i) => {
			const varInfo = objType.privateVariables[i]
			const key = varInfo.name
			dict[key] = varInfo.valueType === 0 ? parseInt(val, 10) : val // FIXME: PrivateVariableType
		})
		return dict
	}, [obj, objType])

	const customPinfo: DictionaryPropertyInfo<string | number, string> = useMemo(() => {
		return {
			type: 'Dictionary',
			key: pinfo.key,
			keyTypes: ['string'],
			valueTypes: ['int', 'string'],
			value,
		}
	}, [pinfo, value])

	return <InspectorDictionary pinfo={customPinfo} onChange={(newValue) => {
		for (const key of Object.keys(value)) {
			if (!(key in newValue)) {
				// TODO: confirmation modal
				dispatch(actions.removePrivateVariable({ objectTypeId: obj.objectTypeId, prop: key }))
			}
		}
		for (const key of Object.keys(newValue)) {
			if (!(key in value)) {
				// TODO: confirmation modal
				dispatch(actions.addPrivateVariable({ objectTypeId: obj.objectTypeId, prop: key, initialValue: newValue[key] as any }))
			}
		}
		dispatch(actions.editPrivateVariables({ objectId: obj.id, vars: newValue as any }))
	}} />
}
