import { InspectorValue, InspectorObjectValue, PropertyInfo, getPropertyInfos, InspectorDictionaryValue, InspectorArrayValue, SimplePropertyInfo, ArrayPropertyInfo, RecordPropertyInfo } from "./inspectorUtil"
import React from "react"

export const InspectorObject = (props: { pinfo: SimplePropertyInfo<InspectorObjectValue> }) => {
	const { pinfo } = props
	const obj = pinfo.value
	const propertyInfos = getPropertyInfos(obj)

	return <div className="vbox grow">
		{propertyInfos.map(pinfo => {
			if (pinfo.hidden) { return null }

			const valueComponent = getValueComponent(pinfo)

			return <div className="hbox">
				<div>{pinfo.key}</div>
				<div>{valueComponent}</div>
			</div>
		})}
	</div>
}


export const InspectorArray = (props: { pinfo: ArrayPropertyInfo<InspectorArrayValue> }) => {
	const { pinfo } = props
	return <div>array</div>
}

export const InspectorDictionary = (props: { pinfo: RecordPropertyInfo<InspectorDictionaryValue> }) => {
	const { pinfo } = props
	return <div>dictionary</div>
}

export const InspectorString = (props: { pinfo: SimplePropertyInfo<string>}) => {
	const { pinfo } = props
	return <input type="string" value={pinfo.value} />
}

export const InspectorNumeric = (props: { pinfo: SimplePropertyInfo<number>}) => {
	const { pinfo } = props
	return <input type="number" value={pinfo.value} />
}


function getValueComponent(pinfo: PropertyInfo): React.ReactNode {
	if (pinfo.hidden) { return null }
	switch (pinfo.type) {
		case 'Array':
			return <InspectorArray pinfo={pinfo as any} />
		case 'Record':
			return <InspectorDictionary pinfo={pinfo as any} />
		case 'number':
			return <InspectorNumeric pinfo={pinfo as any} />
		case 'string':
			return <InspectorString pinfo={pinfo as any} />
		case 'unknown':
			return <div>(unknown) {String(pinfo.value)}</div>
		default:
			return <InspectorObject pinfo={pinfo as any} />
	}
}

export default InspectorObject
