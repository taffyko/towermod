import { CustomInspectorObjects, customNumericSubtypeNames, customStringSubtypeNames, propertyInfoOverrides } from "../customInspectorUtil"

export type InspectorObjectValue = CustomInspectorObjects
export type InspectorKeyTypes = string | number
export type SizedInspectorValue = InspectorObjectValue | InspectorKeyTypes | boolean
export type InspectorArrayValue = InspectorValue[]
export interface InspectorRecordValue { [key: InspectorKeyTypes]: InspectorValue }

export type InspectorValue = SizedInspectorValue | InspectorArrayValue | InspectorRecordValue

const numericSubtypeNames = ['int', 'float', ...customNumericSubtypeNames] as const
const stringSubtypeNames = [...customStringSubtypeNames] as const

export type TypeNameToValue = {
	'unknown': unknown,
	'string': string,
	'boolean': boolean,
	'number': number,
	'float': number,
	'int': number,
	'Array': Array<unknown>,
	'Record': Record<string | number, unknown>
} & {
	[T in InspectorObjectValue as T['type']]: T
}
export type InspectorTypeName = keyof TypeNameToValue

type KeyOfValue<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

export type BasePropertyInfo = {
	parent?: ArrayPropertyInfo | RecordPropertyInfo | ObjectPropertyInfo,
	hidden?: boolean,
	// TODO:
	readonly?: boolean,
}

export type ArrayPropertyInfo<T extends InspectorValue = InspectorValue> = BasePropertyInfo & {
	key: InspectorKeyTypes,
	value: readonly T[]
	type: 'Array',
	valueTypes: Array<KeyOfValue<TypeNameToValue, T>>
}

export type RecordPropertyInfo<T extends InspectorValue = InspectorValue, TKey extends InspectorKeyTypes = InspectorKeyTypes> = BasePropertyInfo & {
	key: InspectorKeyTypes,
	value: Readonly<Record<TKey, T>>,
	type: 'Record',
	keyTypes: Array<KeyOfValue<TypeNameToValue, TKey>>,
	valueTypes: Array<KeyOfValue<TypeNameToValue, T>>,
}
export type SimplePropertyInfo<T extends InspectorValue = InspectorValue> = BasePropertyInfo & {
	key: InspectorKeyTypes,
	value: Readonly<T>,
	type: Exclude<InspectorTypeName, 'Array' | 'Record'>,
}
export type ObjectPropertyInfo<T extends InspectorObjectValue = InspectorObjectValue> = BasePropertyInfo & {
	key: keyof T,
	value: T,
	type: T['type'],
}


export type PropertyInfo<T extends InspectorValue = InspectorValue, TKey extends InspectorKeyTypes = InspectorKeyTypes> =
	ArrayPropertyInfo<T> | RecordPropertyInfo<T, TKey> | SimplePropertyInfo<T>

export function inferPropertyInfoFromArrayValue(element: InspectorValue, parentPinfo: ArrayPropertyInfo, idx: number): PropertyInfo {
	const pinfo = inferPropertyInfoFromValue(element, parentPinfo, idx)
	if (parentPinfo.valueTypes) {
		pinfo.type = speciateType(pinfo.type, parentPinfo.valueTypes)
	} else {
		console.warn(`No type information given for Array: ${parentPinfo.type}.${pinfo.key}`)
	}
	return pinfo
}

export function speciateType(type: keyof TypeNameToValue, types: Array<keyof TypeNameToValue>): keyof TypeNameToValue {
	switch (type) {
		case 'number':
			for (const subtype of numericSubtypeNames) {
				if (types.includes(subtype)) { return subtype }
			}
		break; case 'string':
			for (const subtype of stringSubtypeNames) {
				if (types.includes(subtype)) { return subtype }
			}
	}
	if (!types.includes(type)) {
		console.error(`${type} not in [${[...types]},]`)
	}
	return type;
}

export function inferPropertyInfoFromRecordValue(element: InspectorValue, parentPinfo: RecordPropertyInfo, key: InspectorKeyTypes): PropertyInfo {
	const pinfo = inferPropertyInfoFromValue(element, parentPinfo, key)
	if (parentPinfo.valueTypes) {
		pinfo.type = speciateType(pinfo.type, parentPinfo.valueTypes)
	} else {
		console.warn(`No type information given for Record ${parentPinfo.parent?.type}.${parentPinfo.key}`)
	}
	return pinfo
}

export function inferPropertyInfoFromValue(value: InspectorValue, parent: PropertyInfo | undefined, key: InspectorKeyTypes): PropertyInfo {
	const type = inferTypeFromValue(value);
	switch (type) {
		case 'Array':
			return {
				type: 'Array',
				key,
				value,
				parent,
				valueTypes: ['unknown'] as any,
			} as ArrayPropertyInfo
		case 'Record':
			return {
				type: 'Record',
				key,
				value,
				parent,
				keyTypes: ['string', 'number'] as any
			} as RecordPropertyInfo
		default:
			return {
				type,
				key,
				value,
				parent,
			} as SimplePropertyInfo
	}
}

export function inferTypeFromValue(value: InspectorValue): InspectorTypeName {
	if (value instanceof Array) {
		return 'Array'
	} else if (value instanceof Object) {
		if ('type' in value) {
			return (value as InspectorObjectValue)['type']
		} else {
			return 'Record'
		}
	}
	const type = typeof value
	if (type === 'number' || type === 'string') {
		return type
	} else {
		return 'unknown'
	}
}

function objectPropertyInfo(obj: InspectorObjectValue, objPinfo: ObjectPropertyInfo | undefined, key: InspectorKeyTypes): PropertyInfo
{
	const value = obj[key]
	if (key === 'type') { return { key, value, type: 'string', hidden: true } }

	const pinfo = inferPropertyInfoFromValue(value, objPinfo, key);
	propertyInfoOverrides(obj, pinfo, key as any)

	return pinfo
}

export function objectPropertyInfos(objPinfo: ObjectPropertyInfo): PropertyInfo[] {
	const obj = objPinfo.value
	const keys = Object.keys(obj) as (keyof typeof obj)[]
	return keys.map(key => objectPropertyInfo(obj, objPinfo, key))
}
