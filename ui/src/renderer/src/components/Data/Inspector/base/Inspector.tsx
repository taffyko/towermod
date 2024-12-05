import { getCustomComponent } from "../customInspectorUtil"
import { AnyInspectorValue, InspectorObjectValue, AnyPropertyInfo, objectPropertyInfos, InspectorDictionaryValue, InspectorArrayValue, SimplePropertyInfo, ArrayPropertyInfo, DictionaryPropertyInfo, InspectorKeyTypes, inferPropertyInfoFromArrayValue, inferPropertyInfoFromDictionaryValue, ObjectPropertyInfo } from "./inspectorUtil"
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

export const InspectorArray = (props: { pinfo: ArrayPropertyInfo<AnyInspectorValue>, onChange: (v: InspectorArrayValue) => void }) => {
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

export const InspectorDictionary = (props: { pinfo: DictionaryPropertyInfo<AnyInspectorValue>, onChange: (v: InspectorDictionaryValue) => void }) => {
	const { pinfo: dictPinfo, onChange } = props

	const onPropertyChange = (key: InspectorKeyTypes, value: any) => {
		const newObj = { ...dictPinfo.value, [key]: value }
		onChange(newObj)
	}

	const propertyComponents: React.ReactNode[] = useMemo(() => Object.entries(dictPinfo.value).map(([key, val]) => {
		const pinfo = inferPropertyInfoFromDictionaryValue(val, dictPinfo, key)

		const valueComponent = getValueComponent(pinfo, (v) => { onPropertyChange(pinfo.key, v) })

		return <div className="hbox gap" key={pinfo.key}>
			<div>{pinfo.key}:</div>
			<div className="hbox grow">{valueComponent}</div>
		</div>
	}), [dictPinfo.value])

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

function getValueComponent(pinfo: AnyPropertyInfo, onChange: (v: any) => void): React.ReactNode {
	if (pinfo.hidden) { return null }
	const customComponent = getCustomComponent(pinfo, onChange)
	if (customComponent !== undefined) {
		return customComponent
	}
	switch (pinfo.type) {
		case 'Array':
			return <InspectorArray pinfo={pinfo} onChange={onChange} />
		case 'Dictionary':
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
