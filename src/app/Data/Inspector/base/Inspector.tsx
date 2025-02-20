/**
 * Contains implementations for base inspector components for types that are not application-specific
 */
import { Select } from "@/components/Select"
import { defaultValueForType, getCustomComponent } from "../customInspectorUtil"
import { AnyInspectorValue, InspectorObjectValue, AnyPropertyInfo, objectPropertyInfos, InspectorDictionaryValue, InspectorArrayValue, SimplePropertyInfo, ArrayPropertyInfo, DictionaryPropertyInfo, InspectorKeyTypes, inferPropertyInfoFromArrayValue, inferPropertyInfoFromDictionaryValue, ObjectPropertyInfo, inferPropertyInfoFromValue, enumSubtypes } from "./inspectorUtil"
import React, { useMemo, useState } from "react"
import IconButton from "@/components/IconButton"
import plusImg from '@/icons/plus.svg'
import closeImg from '@/icons/close.svg'
import { LineEdit } from "@/components/LineEdit"
import { SpinBox } from "@/components/SpinBox"
import { Toggle } from "@/components/Toggle"
import Style from '../Inspector.module.scss'

export const InspectorObject = (props: {
	pinfo?: ObjectPropertyInfo,
	// supply value instead to infer property info from it
	value?: InspectorObjectValue,
	onChange: (v: InspectorObjectValue) => void
}) => {
	const { value: inputValue, pinfo, onChange } = props

	let objPinfo: ObjectPropertyInfo;
	if (pinfo) {
		objPinfo = pinfo
	} else if (inputValue) {
		objPinfo = inferPropertyInfoFromValue(inputValue, undefined, 'root') as any
	} else {
		return null
	}
	const root = !objPinfo.parent

	const onPropertyChange = (key: InspectorKeyTypes, value: any) => {
		const newObj = { ...objPinfo.value, [key]: value }
		onChange(newObj)
	}

	const propertyInfos = useMemo(() => objectPropertyInfos(objPinfo), [objPinfo.value])

	const propertyComponents: React.ReactNode[] = useMemo(() => propertyInfos.map(pinfo => {
		if (pinfo.hidden) { return null }

		const valueComponent = getValueComponent(pinfo, (v) => { onPropertyChange(pinfo.key, v) })

		return <React.Fragment key={pinfo.key}>
			<div>{pinfo.key}:</div>
			<div className="hbox">{valueComponent}</div>
		</React.Fragment>
	}), [objPinfo.value])

	return <div className={`${Style.grid} ${root ? Style.root : ''}`}>
		{propertyComponents}
	</div>
}

export const InspectorArray = (props: { pinfo: ArrayPropertyInfo<AnyInspectorValue>, onChange: (v: InspectorArrayValue) => void }) => {
	const { pinfo: arrPinfo, onChange } = props

	const onElementChange = (key: InspectorKeyTypes, value: any) => {
		const newArr = [...arrPinfo.value]
		newArr[key as any] = value
		onChange(newArr)
	}

	if (!arrPinfo.valueTypes || arrPinfo.valueTypes[0] === 'unknown') {
		throw new Error(`Need to define 'valueTypes' for array ${arrPinfo.parent?.type}.${arrPinfo.key}`)
	}

	const removeElement = (idx: number) => {
		const newArr = [ ...arrPinfo.value ]
		newArr.splice(idx, 1)
		onChange(newArr)
	}

	const valueComponents: React.ReactNode[] = useMemo(() => arrPinfo.value.map((val, i) => {
		const pinfo = inferPropertyInfoFromArrayValue(val, arrPinfo, i);
		const valueComponent = getValueComponent(pinfo, (v) => { onElementChange(arrPinfo.key, v) })

		return <React.Fragment key={i}>
			<div>
				<IconButton src={closeImg} onClick={() => removeElement(i)} /> {pinfo.key}
			</div>
			<div className="hbox grow">{valueComponent}</div>
		</React.Fragment>
	}), [arrPinfo.value])

	// adding elements
	const [newValueType, setNewValueType] = useState(arrPinfo.valueTypes[0])
	const getDefaultValue = defaultValueForType(newValueType)
	const addElement = getDefaultValue ? () => {
		const newArr = [...arrPinfo.value, getDefaultValue()]
		onChange(newArr)
	} : undefined

	return <div className="vbox grow gap">
		{valueComponents.length ? <div className={Style.grid}>
			{valueComponents}
		</div> : null}
		{addElement ?
			<div className="hbox">
				{arrPinfo.valueTypes.length > 1 ?
					<Select
						onChange={v => setNewValueType(v as any)}
						options={arrPinfo.valueTypes}
					/>
				: null}
				<IconButton src={plusImg} onClick={() => addElement()} />
			</div>
		: null}
	</div>
}

export const InspectorDictionary = (props: { pinfo: DictionaryPropertyInfo<AnyInspectorValue>, onChange: (v: InspectorDictionaryValue) => void }) => {
	const { pinfo: dictPinfo, onChange } = props

	const onPropertyChange = (key: InspectorKeyTypes, value: any) => {
		const newObj = { ...dictPinfo.value, [key]: value }
		onChange(newObj)
	}

	const removeProperty = (key: InspectorKeyTypes) => {
		const newObj = { ...dictPinfo.value }
		delete newObj[key]
		onChange(newObj)
	}

	const propertyComponents: React.ReactNode[] = useMemo(() => Object.entries(dictPinfo.value).map(([key, val]) => {
		const pinfo = inferPropertyInfoFromDictionaryValue(val, dictPinfo, key)

		const valueComponent = getValueComponent(pinfo, (v) => { onPropertyChange(pinfo.key, v) })

		return <React.Fragment key={pinfo.key}>
			<div>
				{pinfo.key}:
				<IconButton src={closeImg} onClick={() => removeProperty(pinfo.key)} />
			</div>
			<div className="hbox">{valueComponent}</div>
		</React.Fragment>
	}), [dictPinfo.value])

	// adding properties
	const [newKeyText, setNewKeyText] = useState("")
	if (!dictPinfo.valueTypes || dictPinfo.valueTypes[0] === 'unknown') {
		if (dictPinfo.parent?.type === 'Array') {
			const obj = dictPinfo.parent.parent
			throw new Error(`Need to define 'valueTypes' for dictionary at ${obj?.type}.${dictPinfo.parent.key}[${dictPinfo.key}]`)
		} else {
			throw new Error(`Need to define 'valueTypes' for dictionary ${dictPinfo.parent?.type}.${dictPinfo.key}`)
		}
	}
	const [newValueType, setNewValueType] = useState(dictPinfo.valueTypes[0])
	const getDefaultValue = defaultValueForType(newValueType)
	const addProperty = getDefaultValue ? () => {
		const newObj = { ...dictPinfo.value, [newKeyText]: getDefaultValue() }
		setNewKeyText("")
		onChange(newObj)
	} : undefined

	return <div className="vbox grow gap" key={dictPinfo.key}>
		{propertyComponents.length ? <div className={Style.grid}>
			{propertyComponents}
		</div> : null}
		{addProperty ?
			<div className="hbox gap">
				<LineEdit value={newKeyText} onChange={e => setNewKeyText(e.target.value)} />
				{dictPinfo.valueTypes.length > 1 ?
					<Select
						onChange={v => setNewValueType(v as any)}
						options={dictPinfo.valueTypes}
					/>
				: null}
				<IconButton src={plusImg} disabled={!newKeyText} onClick={() => addProperty()} />
			</div>
		: null}
	</div>
}

export const InspectorString = (props: { pinfo: SimplePropertyInfo<string>, onChange: (v: string) => void}) => {
	const { pinfo, onChange } = props
	if (pinfo.readonly) {
		return <div>{pinfo.value}</div>
	}
	return <LineEdit value={pinfo.value} onChange={e => onChange(e.target.value)} />
}

export const InspectorNumeric = (props: { pinfo: SimplePropertyInfo<number>, onChange: (v: number) => void}) => {
	const { pinfo, onChange } = props
	if (pinfo.readonly) {
		return <div>{pinfo.value}</div>
	}
	return <SpinBox value={pinfo.value} onChange={onChange} int={pinfo.type === 'int'} />
}

export const InspectorBoolean = (props: { pinfo: SimplePropertyInfo<boolean>, onChange: (v: boolean) => void }) => {
	const { pinfo, onChange } = props
	return <Toggle disabled={pinfo.readonly} value={pinfo.value} onChange={onChange} />
}

function InspectorSelect(props: { pinfo: SimplePropertyInfo<string>, options: string[], onChange: (v: string) => void }) {
	const { pinfo, options, onChange } = props
	return <Select disabled={pinfo.readonly} value={pinfo.value} onChange={onChange} options={options} />
}

function getValueComponent(pinfo: AnyPropertyInfo, onChange: (v: any) => void): React.ReactNode {
	if (pinfo.hidden) { return null }
	const customComponent = getCustomComponent(pinfo, onChange)
	if (customComponent !== undefined) {
		return customComponent
	}
	switch (pinfo.type) {
		case 'Array':
			return <InspectorArray pinfo={pinfo as any} onChange={onChange} />
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
			if (pinfo.type in enumSubtypes) {
				const options: string[] = (enumSubtypes as any)[pinfo.type]
				return <InspectorSelect pinfo={pinfo as any} options={options} onChange={onChange} />
			}
			return <InspectorObject pinfo={pinfo as any} onChange={onChange} />
	}
}

export default InspectorObject
