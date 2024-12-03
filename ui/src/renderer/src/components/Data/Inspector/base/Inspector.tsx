import { getCustomComponent } from "../customInspectorUtil"
import { InspectorValue, InspectorObjectValue, PropertyInfo, objectPropertyInfos, InspectorRecordValue, InspectorArrayValue, SimplePropertyInfo, ArrayPropertyInfo, RecordPropertyInfo, InspectorKeyTypes, inferPropertyInfoFromArrayValue, inferPropertyInfoFromRecordValue, ObjectPropertyInfo } from "./inspectorUtil"
import React, { useMemo } from "react"

export const InspectorObject = (props: {
	pinfo: ObjectPropertyInfo,
	onChange: (v: InspectorObjectValue) => void
}) => {
	const { pinfo: objPinfo, onChange } = props

	const onPropertyChange = (key: InspectorKeyTypes, value: any) => {
		const newObj = { ...objPinfo.value, [key]: value }
		onChange(newObj)
	}

	const propertyInfos = useMemo(() => objectPropertyInfos(objPinfo), [objPinfo.value])
	const propertyComponents: React.ReactNode[] = useMemo(() => propertyInfos.map(pinfo => {
		if (pinfo.hidden) { return null }

		const valueComponent = getValueComponent(pinfo, (v) => { onPropertyChange(pinfo.key, v) })

		return <div className="hbox gap" key={pinfo.key}>
			<div>{pinfo.key}:</div>
			<div className="hbox grow">{valueComponent}</div>
		</div>
	}), [objPinfo.value])

	return <div className="vbox grow">
		{propertyComponents}
	</div>
}

export const InspectorArray = (props: { pinfo: ArrayPropertyInfo<InspectorValue>, onChange: (v: InspectorArrayValue) => void }) => {
	const { pinfo: arrPinfo, onChange } = props

	const onElementChange = (key: InspectorKeyTypes, value: any) => {
		const newArr = [...arrPinfo.value]
		newArr[key] = value
		onChange(newArr)
	}

	const valueComponents: React.ReactNode[] = useMemo(() => arrPinfo.value.map((val, i) => {
		const pinfo = inferPropertyInfoFromArrayValue(val, arrPinfo, i);
		const valueComponent = getValueComponent(pinfo, (v) => { onElementChange(arrPinfo.key, v) })

		return <div className="hbox gap" key={pinfo.key}>
			<div>{i}:</div>
			<div className="hbox grow">{valueComponent}</div>
		</div>
	}), [arrPinfo.value])

	return <div className="vbox grow">
		{valueComponents}
	</div>
}

export const InspectorRecord = (props: { pinfo: RecordPropertyInfo<InspectorRecordValue>, onChange: (v: InspectorRecordValue) => void }) => {
	const { pinfo: recordPinfo, onChange } = props

	const onPropertyChange = (key: InspectorKeyTypes, value: any) => {
		const newObj = { ...recordPinfo.value, [key]: value }
		onChange(newObj)
	}

	const propertyComponents: React.ReactNode[] = useMemo(() => Object.entries(recordPinfo.value).map(([key, val]) => {
		const pinfo = inferPropertyInfoFromRecordValue(val, recordPinfo, key)

		const valueComponent = getValueComponent(pinfo, (v) => { onPropertyChange(pinfo.key, v) })

		return <div className="hbox gap" key={pinfo.key}>
			<div>{pinfo.key}:</div>
			<div className="hbox grow">{valueComponent}</div>
		</div>
	}), [recordPinfo.value])

	return <div className="vbox grow">
		{propertyComponents}
	</div>
}

export const InspectorString = (props: { pinfo: SimplePropertyInfo<string>, onChange: (v: string) => void}) => {
	const { pinfo, onChange } = props
	if (pinfo.readonly) {
		return <div>{pinfo.value}</div>
	}
	return <input className="grow" type="string" value={pinfo.value} onChange={(e) => onChange(e.target.value)} />
}

export const InspectorNumeric = (props: { pinfo: SimplePropertyInfo<number>, onChange: (v: number) => void}) => {
	const { pinfo, onChange } = props
	if (pinfo.readonly) {
		return <div>{pinfo.value}</div>
	}
	return <input className="grow" type="number" value={pinfo.value} onChange={(e) => onChange(Number(e.target.value))} />
}

export const InspectorBoolean = (props: { pinfo: SimplePropertyInfo<boolean>, onChange: (v: boolean) => void }) => {
	const { pinfo, onChange } = props
	if (pinfo.readonly) {
		return <div>{pinfo.value}</div>
	}
	return <input className="grow" type="checkbox" checked={pinfo.value} onChange={(e) => onChange(e.target.checked)} />
}

function getValueComponent(pinfo: PropertyInfo, onChange: (v: any) => void): React.ReactNode {
	if (pinfo.hidden) { return null }
	const customComponent = getCustomComponent(pinfo, onChange)
	if (customComponent !== undefined) {
		return customComponent
	}
	switch (pinfo.type) {
		case 'Array':
			return <InspectorArray pinfo={pinfo} onChange={onChange} />
		case 'Record':
			return <InspectorRecord pinfo={pinfo as any} onChange={onChange} />
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
