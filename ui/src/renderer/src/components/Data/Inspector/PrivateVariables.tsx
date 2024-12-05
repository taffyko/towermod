import { useAppSelector } from "@renderer/hooks";
import { InspectorRecord } from ".";
import { ArrayPropertyInfo, RecordPropertyInfo, SimplePropertyInfo } from "./base/inspectorUtil";
import { findObjectTypeById } from "@shared/reducers/data";
import { ObjectInstance, PrivateVariable } from "@towermod";
import { assert } from "@shared/util";
import { useMemo } from "react";

export function PrivateVariables(props: { pinfo: ArrayPropertyInfo<PrivateVariable> }) {
	const { pinfo } = props
	const objPinfo = assert(pinfo.parent) as SimplePropertyInfo<ObjectInstance>
	const obj = objPinfo.value;

	const objType = useAppSelector(state => findObjectTypeById(state.data, obj.objectTypeId))
	objType.privateVariables

	const value = useMemo(() => {
		const dict: Record<string, string | number> = {}
		obj.privateVariables.forEach((val, i) => {
			const key = objType.privateVariables[i].name
			dict[key] = val
		})
		return dict
	}, [obj, objType])

	const customPinfo: RecordPropertyInfo<string | number, string> = useMemo(() => {
		return {
			type: 'Record',
			key: pinfo.key,
			keyTypes: ['string'],
			valueTypes: ['int', 'string'],
			value,
		}
	}, [pinfo, value])

	return <InspectorRecord pinfo={customPinfo} onChange={v => {
		// TODO
	}} />
}
