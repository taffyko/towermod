import { useAppDispatch } from "@renderer/hooks"
import { InspectorValue, InspectorObjectValue, PropertyInfo, getPropertyInfos, InspectorRecordValue, InspectorArrayValue, SimplePropertyInfo, ArrayPropertyInfo, RecordPropertyInfo, InspectorKeyTypes, inferPropertyInfoFromValue, inferPropertyInfoFromArrayValue } from "./inspectorUtil"
import { actions } from "@shared/reducers"
import React, { useEffect, useMemo, useState } from "react"
import { ObjectInstance } from "@towermod"

export const InspectorObject = (props: { pinfo: SimplePropertyInfo<InspectorObjectValue>, onChange: (v: InspectorObjectValue) => void }) => {
	const { pinfo, onChange } = props

	const obj = pinfo.value
	const onPropertyChange = (key: InspectorKeyTypes, value: any) => {
		const newObj = { ...obj, [key]: value }
		onChange(newObj)
	}

	const propertyInfos = useMemo(() => getPropertyInfos(pinfo.value), [pinfo.value])
	const propertyComponents: React.ReactNode[] = useMemo(() => propertyInfos.map(pinfo => {
		if (pinfo.hidden) { return null }
		pinfo.value = obj[pinfo.key]

		const valueComponent = getValueComponent(pinfo, (v) => { onPropertyChange(pinfo.key, v) })

		return <div className="hbox gap" key={pinfo.key}>
			<div>{pinfo.key}:</div>
			<div className="hbox grow">{valueComponent}</div>
		</div>
	}), [propertyInfos, obj])

	return <div className="vbox grow">
		{propertyComponents}
	</div>
}


export const InspectorArray = (props: { pinfo: ArrayPropertyInfo<InspectorValue>, onChange: (v: InspectorArrayValue) => void }) => {
	const { pinfo, onChange } = props

	const onElementChange = (key: InspectorKeyTypes, value: any) => {
		const newArr = [...pinfo.value]
		newArr[key] = value
		onChange(newArr)
	}

	const valueComponents: React.ReactNode[] = useMemo(() => pinfo.value.map((val, i) => {
		const valuePinfo = inferPropertyInfoFromArrayValue(val, pinfo, i);
		const valueComponent = getValueComponent(valuePinfo, (v) => { onElementChange(pinfo.key, v) })

		return <div className="hbox gap" key={pinfo.key}>
			<div>{i}:</div>
			<div className="hbox grow">{valueComponent}</div>
		</div>
	}), [pinfo.value])



	return <div className="vbox grow">
		{valueComponents}
	</div>
}

export const InspectorDictionary = (props: { pinfo: RecordPropertyInfo<InspectorRecordValue>, onChange: (v: InspectorRecordValue) => void }) => {
	const { pinfo, onChange } = props
	// TODO
	return <div>dictionary</div>
}

export const InspectorString = (props: { pinfo: SimplePropertyInfo<string>, onChange: (v: string) => void}) => {
	const { pinfo, onChange } = props
	return <input className="grow" type="string" value={pinfo.value} onChange={(e) => onChange(e.target.value)} />
}

export const InspectorNumeric = (props: { pinfo: SimplePropertyInfo<number>, onChange: (v: number) => void}) => {
	const { pinfo, onChange } = props
	return <input className="grow" type="number" value={pinfo.value} onChange={(e) => onChange(Number(e.target.value))} />
}

export const InspectorBoolean = (props: { pinfo: SimplePropertyInfo<number>, onChange: (v: boolean) => void }) => {
	const { pinfo, onChange } = props
	return <input className="grow" type="checkbox" value={pinfo.value} onChange={(e) => onChange(e.target.checked)} />
}

function getValueComponent(pinfo: PropertyInfo, onChange: (v: any) => void): React.ReactNode {
	if (pinfo.hidden) { return null }
	switch (pinfo.type) {
		case 'Array':
			return <InspectorArray pinfo={pinfo} onChange={onChange} />
		case 'Record':
			return <InspectorDictionary pinfo={pinfo as any} onChange={onChange} />
		case 'number': case 'int': case 'float':
			return <InspectorNumeric pinfo={pinfo as any} onChange={onChange} />
		case 'string':
			return <InspectorString pinfo={pinfo as any} onChange={onChange} />
		case 'boolean':
			return <InspectorBoolean pinfo={pinfo as any} onChange={onChange} />
		case 'unknown':
			return <div>(unknown) {String(pinfo.value)}</div>
		default:
			return <InspectorObject pinfo={pinfo as any} onChange={onChange} />
	}
}

export default InspectorObject
