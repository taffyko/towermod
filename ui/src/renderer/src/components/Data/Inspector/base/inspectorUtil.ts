import { CustomInspectorObjects, customNumericSubtypeNames, customStringSubtypeNames, propertyInfoOverrides } from "../customInspectorUtil"

export type InspectorObjectValue = CustomInspectorObjects
export type InspectorKeyTypes = string | number
export type SizedInspectorValue = InspectorObjectValue | InspectorKeyTypes | boolean
export type InspectorArrayValue = AnyInspectorValue[]
export interface InspectorDictionaryValue { [key: InspectorKeyTypes]: AnyInspectorValue }

export type AnyInspectorValue = SizedInspectorValue | InspectorArrayValue | InspectorDictionaryValue

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
	'Dictionary': Record<string | number, unknown>
} & {
	[T in InspectorObjectValue as T['type']]: T
}
export type InspectorTypeName = keyof TypeNameToValue

type KeyOfValue<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

export type BasePropertyInfo = {
	parent?: ArrayPropertyInfo | DictionaryPropertyInfo | ObjectPropertyInfo,
	hidden?: boolean,
	readonly?: boolean,
}

export type ArrayPropertyInfo<T extends AnyInspectorValue = AnyInspectorValue> = BasePropertyInfo & {
	key: InspectorKeyTypes,
	value: readonly T[]
	type: 'Array',
	valueTypes: Array<KeyOfValue<TypeNameToValue, T>>
}

export type DictionaryPropertyInfo<T extends AnyInspectorValue = AnyInspectorValue, TKey extends InspectorKeyTypes = InspectorKeyTypes> = BasePropertyInfo & {
	key: InspectorKeyTypes,
	value: Readonly<Record<TKey, T>>,
	type: 'Dictionary',
	keyTypes: Array<KeyOfValue<TypeNameToValue, TKey>>,
	valueTypes: Array<KeyOfValue<TypeNameToValue, T>>,
}
export type SimplePropertyInfo<T extends AnyInspectorValue = AnyInspectorValue> = BasePropertyInfo & {
	key: InspectorKeyTypes,
	value: Readonly<T>,
	type: Exclude<InspectorTypeName, 'Array' | 'Dictionary'>,
}
export type ObjectPropertyInfo<T extends InspectorObjectValue = InspectorObjectValue> = BasePropertyInfo & {
	key: keyof T,
	value: T,
	type: T['type'],
}


export type AnyPropertyInfo<T extends AnyInspectorValue = AnyInspectorValue, TKey extends InspectorKeyTypes = InspectorKeyTypes> =
	ArrayPropertyInfo<T> | DictionaryPropertyInfo<T, TKey> | SimplePropertyInfo<T>

export function inferPropertyInfoFromArrayValue(element: AnyInspectorValue, parentPinfo: ArrayPropertyInfo, idx: number): AnyPropertyInfo {
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
		console.warn(`${type} not in [${[...types]},]`)
	}
	return type;
}

export function inferPropertyInfoFromDictionaryValue(element: AnyInspectorValue, parentPinfo: DictionaryPropertyInfo, key: InspectorKeyTypes): AnyPropertyInfo {
	const pinfo = inferPropertyInfoFromValue(element, parentPinfo, key)
	if (parentPinfo.valueTypes) {
		pinfo.type = speciateType(pinfo.type, parentPinfo.valueTypes)
	} else {
		console.warn(`No type information given for Dictionary ${parentPinfo.parent?.type}.${parentPinfo.key}`)
	}
	return pinfo
}

export function inferPropertyInfoFromValue(value: AnyInspectorValue, parent: AnyPropertyInfo | undefined, key: InspectorKeyTypes): AnyPropertyInfo {
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
		case 'Dictionary':
			return {
				type: 'Dictionary',
				key,
				value,
				parent,
				keyTypes: ['string', 'number'] as any
			} as DictionaryPropertyInfo
		default:
			return {
				type,
				key,
				value,
				parent,
			} as SimplePropertyInfo
	}
}

export function inferTypeFromValue(value: AnyInspectorValue): InspectorTypeName {
	if (value instanceof Array) {
		return 'Array'
	} else if (value instanceof Object) {
		if ('type' in value) {
			return (value as InspectorObjectValue)['type']
		} else {
			return 'Dictionary'
		}
	}
	const type = typeof value
	switch (type) {
		case 'number':
		case 'boolean':
		case 'string':
			return type
		default:
			return 'unknown'
	}
}

function objectPropertyInfo(obj: InspectorObjectValue, objPinfo: ObjectPropertyInfo | undefined, key: InspectorKeyTypes): AnyPropertyInfo
{
	const value = obj[key]
	if (key === 'type') { return { key, value, type: 'string', hidden: true } }

	const pinfo = inferPropertyInfoFromValue(value, objPinfo, key);
	propertyInfoOverrides(obj, pinfo, key as any)

	return pinfo
}

export function objectPropertyInfos(objPinfo: ObjectPropertyInfo): AnyPropertyInfo[] {
	const obj = objPinfo.value
	const keys = Object.keys(obj) as (keyof typeof obj)[]
	return keys.map(key => objectPropertyInfo(obj, objPinfo, key))
}
