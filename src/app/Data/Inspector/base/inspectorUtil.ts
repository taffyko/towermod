import { float, int } from "@/util/util"
import { CustomInspectorObjects, customNumericSubtypeNames, customStringSubtypeNames, applyPropertyInfoOverrides, customEnumSubtypes, CustomEnumToValue, getCustomProperties } from "../customInspectorUtil"

export type InspectorObjectValue = CustomInspectorObjects
export type InspectorKeyTypes = string | number
export type SizedInspectorValue = InspectorObjectValue | InspectorKeyTypes | boolean
export type InspectorArrayValue = AnyInspectorValue[]
export interface InspectorDictionaryValue { [key: InspectorKeyTypes]: AnyInspectorValue }

export type AnyInspectorValue = SizedInspectorValue | InspectorArrayValue | InspectorDictionaryValue

const numericSubtypeNames = ['int', 'float', ...customNumericSubtypeNames] as const
const stringSubtypeNames = [...customStringSubtypeNames] as const
export const enumSubtypes = {...customEnumSubtypes} as const;

export type TypeNameToValue = {
	'unknown': unknown,
	'string': string,
	'boolean': boolean,
	'number': number,
	'float': float,
	'int': int,
	'Array': Array<unknown>,
	'Dictionary': Record<string | number, unknown>
} & CustomEnumToValue & {
	[T in InspectorObjectValue as T['_type']]: T
}
export type InspectorTypeName = keyof TypeNameToValue

type KeyOfValue<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

export type BasePropertyInfo = {
	parent?: ArrayPropertyInfo | DictionaryPropertyInfo | ObjectPropertyInfo,
	hidden?: boolean,
	readonly?: boolean,
	custom?: boolean,
}

export type ArrayPropertyInfo<T extends AnyInspectorValue = AnyInspectorValue> = BasePropertyInfo & {
	key: InspectorKeyTypes,
	value: readonly T[]
	type: 'Array',
	/** List of type names representing the union of types this array can contain */
	valueTypes?: Array<string & (KeyOfValue<TypeNameToValue, T> | 'unknown')>
}

export type DictionaryPropertyInfo<T extends AnyInspectorValue = AnyInspectorValue, TKey extends InspectorKeyTypes = InspectorKeyTypes> = BasePropertyInfo & {
	key: InspectorKeyTypes,
	value: Readonly<Record<TKey, T>>,
	type: 'Dictionary',
	/** List of type names representing the union of key types this dictionary can use to key its values */
	keyTypes: Array<KeyOfValue<TypeNameToValue, TKey>>,
	/** List of type names representing the union of value types this dictionary can contain */
	valueTypes: Array<string & (KeyOfValue<TypeNameToValue, T> | 'unknown')>,
}
export type SimplePropertyInfo<T extends AnyInspectorValue = AnyInspectorValue> = BasePropertyInfo & {
	key: InspectorKeyTypes,
	value: Readonly<T>,
	type: Exclude<InspectorTypeName, 'Array' | 'Dictionary'>,
}
export type ObjectPropertyInfo<T extends InspectorObjectValue = InspectorObjectValue> = BasePropertyInfo & {
	key: keyof T,
	value: T,
	type: T['_type'],
}
type CustomPropertyInfo = BasePropertyInfo & { key: InspectorKeyTypes, custom: true, type: 'unknown', value: unknown }


/** Property descriptors for objects and collections, which are capable of having sub-properties of their own */
export type ParentPropertyInfo = ArrayPropertyInfo | DictionaryPropertyInfo | ObjectPropertyInfo
export type AnyPropertyInfo<T extends AnyInspectorValue = AnyInspectorValue, TKey extends InspectorKeyTypes = InspectorKeyTypes> =
	ArrayPropertyInfo<T> | DictionaryPropertyInfo<T, TKey> | SimplePropertyInfo<T> | CustomPropertyInfo

export function inferPropertyInfoFromArrayValue(element: AnyInspectorValue, parentPinfo: ArrayPropertyInfo, idx: number): AnyPropertyInfo {
	const pinfo = inferPropertyInfoFromValue(element, parentPinfo, idx)
	if (parentPinfo.valueTypes) {
		pinfo.type = speciateType(pinfo.type, parentPinfo.valueTypes)
	} else {
		console.warn(`No type information given for Array: ${parentPinfo.type}.${pinfo.key}`)
	}
	return pinfo
}


function speciateType(type: keyof TypeNameToValue, types: Array<keyof TypeNameToValue>): keyof TypeNameToValue {
	if (types.length === 1) { return types[0] }
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
		console.warn(`speciateType error: '${type}' is not one of these types: [${types.join(', ')}]`)
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

export function inferPropertyInfoFromValue(value: AnyInspectorValue, parent: AnyPropertyInfo | undefined, key: InspectorKeyTypes, unknownOk = false): AnyPropertyInfo {
	if (parent?.custom) { unknownOk = true }
	const type = inferTypeFromValue(value, unknownOk);
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
				valueTypes: ['unknown'] as any,
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

export function inferTypeFromValue(value: AnyInspectorValue, unknownOk = false): InspectorTypeName {
	if (value instanceof Array) {
		return 'Array'
	} else if (value instanceof Object) {
		if ('_type' in value) {
			return (value as InspectorObjectValue)['_type']
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
			if (!unknownOk) {
				console.error("Cannot infer type from value", value)
			}
			return 'unknown'
	}
}

function objectPropertyInfo(obj: InspectorObjectValue, objPinfo: ObjectPropertyInfo | undefined, key: InspectorKeyTypes): AnyPropertyInfo
{
	const value = (obj as any)[key]
	if (key === '_type') { return { key, value, type: 'string', hidden: true } }
	const pinfo = inferPropertyInfoFromValue(value, objPinfo, key, true);
	applyPropertyInfoOverrides(obj, pinfo, key)

	if (!(pinfo.hidden || pinfo.custom) && pinfo.type === 'unknown') {
		console.error(`Cannot determine type of ${obj._type}.${key}, value`, value)
	}

	return pinfo
}

export function objectPropertyInfos(objPinfo: ObjectPropertyInfo): AnyPropertyInfo[] {
	const obj = objPinfo.value
	const keys = Object.keys(obj)
	const pinfos = keys.map(key => objectPropertyInfo(obj, objPinfo, key))

	const customProperties = getCustomProperties(objPinfo)
	if (customProperties) {
		const customPinfos: CustomPropertyInfo[] = customProperties
			.map(key => ({ key, custom: true, type: 'unknown' as any, value: undefined as any, parent: objPinfo }))
		pinfos.splice(keys.length - 1, 0, ...customPinfos)
	}
	return pinfos
}
