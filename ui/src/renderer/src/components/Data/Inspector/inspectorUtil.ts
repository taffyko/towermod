import { AppBlock, Behavior, Container, Family, Layout, LayoutLayer, ObjectInstance, ObjectTrait, ObjectType, Animation } from "@towermod"

type TowermodObject = Layout | LayoutLayer | ObjectInstance | Animation | Behavior | Container | Family | ObjectType | ObjectTrait | AppBlock | Animation

export type InspectorObjectValue = TowermodObject
type InspectorKeyTypes = string | number
export type SizedInspectorValue = InspectorObjectValue | InspectorKeyTypes
export type InspectorDictionaryValue = Record<InspectorKeyTypes, SizedInspectorValue>
export type InspectorArrayValue = Array<SizedInspectorValue>

export type InspectorValue = SizedInspectorValue | Array<SizedInspectorValue> | InspectorDictionaryValue

export type TypeNameToValue = {
	'unknown': unknown,
	'string': string,
	'boolean': boolean,
	'number': number,
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
}

export type ArrayPropertyInfo<T extends InspectorValue = InspectorValue> = BasePropertyInfo & {
	value: Array<T>
	type: 'Array',
	valueTypes: Set<KeyOfValue<TypeNameToValue, T>>
}

export type RecordPropertyInfo<T extends InspectorValue = InspectorValue, TKey extends InspectorKeyTypes = InspectorKeyTypes> = BasePropertyInfo & {
	value: Record<TKey, T>,
	type: 'Record',
	keyTypes: Set<KeyOfValue<TypeNameToValue, TKey>>,
	valueTypes: Set<KeyOfValue<TypeNameToValue, T>>,
}

export type SimplePropertyInfo<T extends InspectorValue = InspectorValue> = BasePropertyInfo & {
	value: T,
	hidden?: boolean,
	type: Exclude<InspectorTypeName, 'Array' | 'Record'>,
}

export type PropertyInfo<T extends InspectorValue = InspectorValue, TKey extends InspectorKeyTypes = InspectorKeyTypes> =
	ArrayPropertyInfo<T> | RecordPropertyInfo<T, TKey> | SimplePropertyInfo<T>

export function getPropertyInfos(obj: InspectorObjectValue): PropertyInfo[] {
	const keys = Object.keys(obj) as (keyof typeof obj)[]
	return keys.map(key => objectPropertyInfo(obj, key))
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

	const pinfo: Partial<PropertyInfo> = { key, value }
	const objType = obj['type'];
	switch (objType) {
		// Property info overrides here
	}

	return inferPropertyInfoFromValue(value, key);
}
