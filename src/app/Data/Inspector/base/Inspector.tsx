/**
 * Contains implementations for base inspector components for types that are not application-specific
 */
import IconButton from "@/components/IconButton"
import { LineEdit } from "@/components/LineEdit"
import { Portal } from "@/components/Portal"
import { Select } from "@/components/Select"
import { SpinBox } from "@/components/SpinBox"
import Text from '@/components/Text'
import { Toggle } from "@/components/Toggle"
import arrowDownImg from '@/icons/arrowDown.svg'
import arrowRightImg from '@/icons/arrowRight.svg'
import closeImg from '@/icons/close.svg'
import plusImg from '@/icons/plus.svg'
import { useStateRef } from "@/util"
import clsx from "clsx"
import React, { startTransition, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { List, ListImperativeAPI, RowComponentProps, useDynamicRowHeight } from "react-window"
import { defaultValueForType, getCustomComponent } from "../customInspectorUtil"
import Style from '../Inspector.module.scss'
import { AnyInspectorValue, AnyPropertyInfo, ArrayPropertyInfo, DictionaryPropertyInfo, InspectorArrayValue, InspectorDictionaryValue, InspectorKeyTypes, InspectorObjectValue, ObjectPropertyInfo, SimplePropertyInfo, enumSubtypes, inferPropertyInfoFromArrayValue, inferPropertyInfoFromDictionaryValue, inferPropertyInfoFromValue, objectPropertyInfos } from "./inspectorUtil"

export const InspectorObject = (props: {
	pinfo?: ObjectPropertyInfo,
	// supply value instead to infer property info from it
	value?: InspectorObjectValue,
	onChange: (v: InspectorObjectValue) => void
}) => {
	const { value: inputValue, pinfo, onChange } = props

	// BUGFIX: not actually using collapsiblity
	const { ref, contentsEl } = useCollapsible()

	let objPinfo: ObjectPropertyInfo | undefined
	if (pinfo) {
		objPinfo = pinfo
	} else if (inputValue) {
		objPinfo = inferPropertyInfoFromValue(inputValue, undefined, 'root') as any
	}
	const root = !objPinfo?.parent

	const onPropertyChange = (key: InspectorKeyTypes, value: any) => {
		if (!objPinfo) return
		const newObj = { ...objPinfo.value, [key]: value }
		onChange(newObj)
	}

	const propertyInfos = useMemo(() => 
		objPinfo ? objectPropertyInfos(objPinfo).filter(p => !p.hidden) : []
	, [objPinfo?.value])
	
	const list = propertyInfos.map((_, i) => {
		return <InspectorRow ariaAttributes={{} as any} style={{}} index={i} entries={propertyInfos} onPropertyChange={onPropertyChange} />
	})

	return <Suspense fallback="Loading...">
		<div ref={ref} className="contents">
			{root ?
				<div className={clsx(Style.container, Style.root)}>
					{list}
				</div>
				:
				<Portal parent={contentsEl}>
					<div className={Style.container}>
						{list}
					</div>
				</Portal>
			}
		</div>
	</Suspense>
}

export const InspectorArray = <T extends AnyInspectorValue>(props: {
	pinfo: ArrayPropertyInfo<T>,
	onChange?: (v: InspectorArrayValue) => void,
	/** Override the component used for each value */
	getValueComponent?: (pinfo: AnyPropertyInfo<T>, onChange: (v: any) => void) => React.ReactNode,
	getDefaultValue?: () => T,
}) => {
	const { pinfo: arrPinfo, onChange } = props

	const onElementChange = (key: InspectorKeyTypes, value: any) => {
		const newArr = [...arrPinfo.value]
		newArr[key as any] = value
		onChange?.(newArr)
	}

	if (!arrPinfo.valueTypes || arrPinfo.valueTypes[0] === 'unknown') {
		if (!arrPinfo.valueTypes) { arrPinfo.valueTypes = ['unknown'] }
		if (!arrPinfo.custom) {
			console.error(`Need to define 'valueTypes' for array ${arrPinfo.parent?.type}.${arrPinfo.key}`)
		}
	}

	const removeElement = (idx: number) => {
		const newArr = [ ...arrPinfo.value ]
		newArr.splice(idx, 1)
		onChange?.(newArr)
	}

	// adding elements
	let canAddElements = !arrPinfo.readonly
	const [newValueType, setNewValueType] = useState(arrPinfo.valueTypes[0])
	if (newValueType === 'unknown' && !arrPinfo.fixed && !props.getDefaultValue) {
		canAddElements = false
		console.error(`Need to define 'valueTypes' or provide custom getDefaultValue implementation for non-readonly array ${arrPinfo.parent?.type}.${arrPinfo.key}`)
	}
	const getDefaultValue = !canAddElements ? undefined : props.getDefaultValue ?? defaultValueForType(newValueType)
	const addElement = getDefaultValue ? () => {
		const newArr = [...arrPinfo.value, getDefaultValue() as T]
		onChange?.(newArr)
	} : undefined

	const { ref, isOpen, ToggleCollapse, contentsEl } = useCollapsible(arrPinfo.uncollapsedByDefault)

	const dynamicRowHeight = useDynamicRowHeight({
		defaultRowHeight: 30,
	})

	const entries = arrPinfo.value.map((val, i) => {
		const pinfo = inferPropertyInfoFromArrayValue(val, arrPinfo as ArrayPropertyInfo<AnyInspectorValue>, i)
		return pinfo
	})

	return <div ref={ref} className="vbox grow gap">
		<ToggleCollapse />
		{isOpen ? !!entries.length && <>
			<Portal parent={contentsEl}>
				<div className={Style.container}>
					<List
						style={{ maxHeight: 300 }}
						rowComponent={InspectorCollectionRow}
						rowCount={entries.length}
						rowHeight={dynamicRowHeight}
						rowProps={{ entries, onPropertyChange: onElementChange, removeProperty: arrPinfo.fixed ? undefined : removeElement, getValueComponent: props.getValueComponent }}
					/>
				</div>
			</Portal>
			{addElement ?
				<div className="hbox">
					{arrPinfo.valueTypes.length > 1 ?
						<Select
							onChange={v => setNewValueType(v as any)}
							options={arrPinfo.valueTypes}
						/>
						: null}
					<IconButton src={plusImg} onClick={() => addElement?.()} />
				</div>
				: null}
		</> : <div className="subtle">{entries.length} items...</div>}
	</div>
}

function useCollapsible(isOpenInitialValue?: boolean) {
	const [el, setEl] = useStateRef<HTMLDivElement>()
	// portal so that elements can be placed inside the label, if one exists
	const labelEl = useMemo(() => {
		if (!el) { return null }
		return el.parentElement?.previousElementSibling?.querySelector('.labelPortal')
	}, [el])
	const contentsEl = useMemo(() => {
		if (!el) { return null }
		return el.parentElement?.parentElement?.parentElement?.querySelector('.contentsPortal')
	}, [el])

	const [isOpen, setIsOpen] = useState(isOpenInitialValue ?? false)

	const ToggleCollapse = useCallback(() =>
		<Portal parent={labelEl}>
			<IconButton
				src={isOpen ? arrowDownImg : arrowRightImg}
				onClick={() => setIsOpen(!isOpen)}
			/>
		</Portal>
	, [labelEl, isOpen, setIsOpen])

	return { ref: setEl, isOpen, ToggleCollapse, contentsEl }
}

function InspectorRow(props: RowComponentProps<{
	entries: AnyPropertyInfo<AnyInspectorValue, InspectorKeyTypes>[],
	onPropertyChange?: (key: InspectorKeyTypes, value: any) => void,
	/** Override the component used for each value */
	getValueComponent?: (pinfo: AnyPropertyInfo, onChange: (v: any) => void) => React.ReactNode,
	buttons?: React.ReactNode,
}>) {
	const { index, style, entries, onPropertyChange } = props
	const pinfo = entries[index]
	const getValComponent = props.getValueComponent ?? getValueComponent
	const valueComponent = getValComponent(pinfo, (v: any) => { onPropertyChange?.(pinfo.key, v) })

	return <div className="flex flex-col flex-nowrap overflow-hidden px-1 gap-1" style={style}>
		<div className="flex row min-h-[30px] gap-1">
			<div className="self-center flex row grow w-0">
				<Text className="grow w-0 overflow-hidden overflow-ellipsis">{pinfo.key}:</Text>
				{props.buttons}
				<div className="labelPortal" />
			</div>
			<div className="self-center flex row grow w-0">
				{valueComponent}
			</div>
		</div>
		<div className="contentsPortal" />
	</div>
}


function InspectorCollectionRow(props: React.ComponentProps<typeof InspectorRow> & {
	removeProperty?: (key: InspectorKeyTypes) => void,
}) {
	const { removeProperty, ...rest } = props
	const { index, entries } = props
	const pinfo = entries[index]

	return <InspectorRow {...rest} buttons={
		removeProperty && <IconButton src={closeImg} onClick={() => removeProperty(pinfo.key)} />
	} />
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

	const entries = useMemo(() =>
		Object.entries(dictPinfo.value)
			.sort(([key1,], [key2,]) => key1 < key2 ? -1 : 1)
			.map(([key, val]) => {
				const pinfo = inferPropertyInfoFromDictionaryValue(val, dictPinfo, key)
				return pinfo
			})
	, [dictPinfo.value])

	// adding properties
	let canAddProperties = !dictPinfo.fixed
	if (!dictPinfo.valueTypes || dictPinfo.valueTypes[0] === 'unknown') {
		dictPinfo.valueTypes = ['unknown']
		canAddProperties = false
		if (dictPinfo.parent?.type === 'Array') {
			const obj = dictPinfo.parent.parent
			console.error(`Need to define 'valueTypes' for dictionary at ${obj?.type}.${dictPinfo.parent.key}[${dictPinfo.key}]`)
		} else {
			console.error(`Need to define 'valueTypes' for dictionary ${dictPinfo.parent?.type}.${dictPinfo.key}`)
		}
	}
	const [newKeyText, setNewKeyText] = useState("")
	const [newValueType, setNewValueType] = useState(dictPinfo.valueTypes[0])
	if (newValueType === 'unknown') { canAddProperties = false }
	const getDefaultValue = canAddProperties ? defaultValueForType(newValueType) : undefined
	const addProperty = getDefaultValue ? () => {
		const newObj = { ...dictPinfo.value, [newKeyText]: getDefaultValue() }
		// set scroll to item intent
		shouldScrollToItemRef.current = newKeyText
		setNewKeyText("")
		onChange(newObj as Record<InspectorKeyTypes, AnyInspectorValue>)
	} : undefined

	const listRef = useRef<ListImperativeAPI>(null)
	const shouldScrollToItemRef = useRef<string | null>(null)
	
	// apply scroll-to-item intent
	useEffect(() => {
		if (!listRef.current || shouldScrollToItemRef.current == null) return
		const index = entries.findIndex(e => e.key === shouldScrollToItemRef.current)
		if (index !== -1) {
			listRef.current.scrollToRow({ index })
		}
		shouldScrollToItemRef.current = null
	}, [entries])

	const { ref, isOpen, ToggleCollapse, contentsEl } = useCollapsible(dictPinfo.uncollapsedByDefault)

	return <div ref={ref} className="vbox grow gap" key={dictPinfo.key}>
		<ToggleCollapse />
		{isOpen ? !!entries.length && <>
			<Portal parent={contentsEl}>
				<div className={Style.container}>
					<List
						listRef={listRef}
						style={{ maxHeight: 300 }}
						rowComponent={InspectorCollectionRow}
						rowCount={entries.length}
						rowHeight={30}
						rowProps={{ entries, onPropertyChange, removeProperty: dictPinfo.fixed ? undefined : removeProperty }}
					/>
				</div>
			</Portal>
		</> : <div className="subtle">{entries.length} entries...</div>}
		{isOpen && addProperty ?
			<div className="hbox gap">
				<LineEdit
					onKeyDown={e => e.code === 'Enter' && addProperty()}
					placeholder="Add new entry..." value={newKeyText}
					onChange={e => setNewKeyText(e.target.value)}
				/>
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
		case 'number': case 'int': case 'float': case 'RgbColor': /* TODO: implement color picker */
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
