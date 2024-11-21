import { TowermodObject } from "@shared/reducers/data"

export type InspectorObjectValue = TowermodObject
export type InspectorKeyTypes = string | number
export type SizedInspectorValue = InspectorObjectValue | InspectorKeyTypes
export type InspectorArrayValue = InspectorValue[]
export interface InspectorRecordValue { [key: InspectorKeyTypes]: InspectorValue }



export type InspectorValue = SizedInspectorValue | InspectorArrayValue | InspectorRecordValue

const numericSubtypeNames = ['int', 'float'] as const
const stringSubtypeNames = [] as const

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
	key: InspectorKeyTypes,
	hidden?: boolean,
	// TODO:
	readonly?: boolean,
}

export type ArrayPropertyInfo<T extends InspectorValue = InspectorValue> = BasePropertyInfo & {
	value: readonly T[]
	type: 'Array',
	valueTypes: Set<KeyOfValue<TypeNameToValue, T>>
}

export type RecordPropertyInfo<T extends InspectorValue = InspectorValue, TKey extends InspectorKeyTypes = InspectorKeyTypes> = BasePropertyInfo & {
	value: Readonly<Record<TKey, T>>,
	type: 'Record',
	keyTypes: Set<KeyOfValue<TypeNameToValue, TKey>>,
	valueTypes: Set<KeyOfValue<TypeNameToValue, T>>,
}

export type SimplePropertyInfo<T extends InspectorValue = InspectorValue> = BasePropertyInfo & {
	value: Readonly<T>,
	hidden?: boolean,
	type: Exclude<InspectorTypeName, 'Array' | 'Record'>,
}

export type PropertyInfo<T extends InspectorValue = InspectorValue, TKey extends InspectorKeyTypes = InspectorKeyTypes> =
	ArrayPropertyInfo<T> | RecordPropertyInfo<T, TKey> | SimplePropertyInfo<T>

export function getPropertyInfos(obj: InspectorObjectValue): PropertyInfo[] {
	const keys = Object.keys(obj) as (keyof typeof obj)[]
	return keys.map(key => objectPropertyInfo(obj, key))
}

export function inferPropertyInfoFromArrayValue(element: InspectorValue, parentPinfo: ArrayPropertyInfo, idx: number): PropertyInfo {
	const pinfo = inferPropertyInfoFromValue(element, idx)
	pinfo.type = speciateType(pinfo.type, parentPinfo.valueTypes)
	return pinfo
}

export function speciateType(type: keyof TypeNameToValue, types: Set<keyof TypeNameToValue>): keyof TypeNameToValue {
	switch (type) {
		case 'number':
			for (const subtype of numericSubtypeNames) {
				if (types.has(subtype)) { return subtype }
			}
		break; case 'string':
			for (const subtype of stringSubtypeNames) {
				if (types.has(subtype)) { return subtype }
			}
	}
	if (!types.has(type)) {
		console.error(`${type} not in [${[...types]},]`)
	}
	return type;
}

export function inferPropertyInfoFromRecordValue(element: InspectorValue, parentPinfo: RecordPropertyInfo, key: string): PropertyInfo {
	const pinfo = inferPropertyInfoFromValue(element, key)
	pinfo.type = speciateType(pinfo.type, parentPinfo.valueTypes)
	return pinfo
}

export function inferPropertyInfoFromValue(value: InspectorValue, key: InspectorKeyTypes): PropertyInfo {
	const type = inferTypeFromValue(value);
	switch (type) {
		case 'Array':
			return {
				type: 'Array',
				key,
				value,
				valueTypes: new Set(['unknown']) as any,
			} as ArrayPropertyInfo
		case 'Record':
			return {
				type: 'Record',
				key,
				value,
				keyTypes: new Set(['string', 'number']) as any
			} as RecordPropertyInfo
		default:
			return {
				type,
				key,
				value,
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

export function objectPropertyInfo(obj: InspectorObjectValue, key: string): PropertyInfo
{

	const value = obj[key]
	if (key === 'type') { return { key, value, type: 'string', hidden: true } }

	const pinfo = inferPropertyInfoFromValue(value, key);
	const type = obj['type'];
	switch (type) {
		case 'Animation':
			override(type, {
				subAnimations: { hidden: true },
				id: { readonly: true },
				frames: { valueTypes: new Set(['AnimationFrame']) },
			})
		break; case 'Layout':
			override(type, {
				layers: { hidden: true },
				imageIds: { hidden: true, }
			})
		break; case 'LayoutLayer':
			override(type, {
				objects: { hidden: true },
			})
		break; case 'ObjectInstance':
			override(type, {
				data: { hidden: true },
			})
		// Property info overrides here
	}

	return pinfo

	function override<T extends TowermodObject['type']>(_type: T, overrides: Partial<Record<keyof TypeNameToValue[T], Partial<PropertyInfo>>>) {
		Object.assign(pinfo, overrides[key])
	}
}
