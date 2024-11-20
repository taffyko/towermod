import { useAppDispatch } from "@renderer/hooks"
import { InspectorValue, InspectorObjectValue, PropertyInfo, getPropertyInfos, InspectorDictionaryValue, InspectorArrayValue, SimplePropertyInfo, ArrayPropertyInfo, RecordPropertyInfo, InspectorKeyTypes } from "./inspectorUtil"
import { actions } from "@shared/reducers"
import React, { useEffect, useMemo, useState } from "react"
import { ObjectInstance } from "@towermod"

export const InspectorObject = (props: { pinfo: SimplePropertyInfo<InspectorObjectValue> }) => {
	const { pinfo } = props
	// Mutable draft copy of object
	const [obj, setObj] = useState(() => ({...pinfo.value}))
	useEffect(() => { setObj({...pinfo.value}) }, [pinfo.value])
	const dispatch = useAppDispatch();

	const onPropertyChange = (key: InspectorKeyTypes, value: any) => {
		console.log(key, value)
		obj[key] = value
		setObj({...obj})
		// FIXME
		if (obj.type === 'ObjectInstance') {
			dispatch(actions.updateObjectInstance(obj))
		}
	}

	const propertyInfos = useMemo(() => getPropertyInfos(pinfo.value), [pinfo.value])
	const valueComponents: React.ReactNode[] = useMemo(() => propertyInfos.map(pinfo => {
		if (pinfo.hidden) { return null }
		pinfo.value = obj[pinfo.key]

		const valueComponent = getValueComponent(pinfo, (v) => {
			onPropertyChange(pinfo.key, v)
		})

		return <div className="hbox gap" key={pinfo.key}>
			<div>{pinfo.key}:</div>
			<div className="hbox grow">{valueComponent}</div>
		</div>
	}), [propertyInfos, obj])

	return <div className="vbox grow">
		{valueComponents}
	</div>
}


export const InspectorArray = (props: { pinfo: ArrayPropertyInfo<InspectorArrayValue> }) => {
	const { pinfo } = props
	// TODO
	return <div>array</div>
}

export const InspectorDictionary = (props: { pinfo: RecordPropertyInfo<InspectorDictionaryValue> }) => {
	const { pinfo } = props
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
			return <InspectorArray pinfo={pinfo as any} />
		case 'Record':
			return <InspectorDictionary pinfo={pinfo as any} />
		case 'number':
			return <InspectorNumeric pinfo={pinfo as any} onChange={onChange} />
		case 'string':
			return <InspectorString pinfo={pinfo as any} onChange={onChange} />
		case 'boolean':
			return <InspectorBoolean pinfo={pinfo as any} onChange={onChange} />
		case 'unknown':
			return <div>(unknown) {String(pinfo.value)}</div>
		default:
			return <InspectorObject pinfo={pinfo as any} />
	}
}

export default InspectorObject
