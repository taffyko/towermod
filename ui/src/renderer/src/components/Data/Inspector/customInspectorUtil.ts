import React from 'react'
import { TowermodObject } from "@shared/reducers/data";
import type { PropertyInfo, InspectorObjectValue, TypeNameToValue, InspectorKeyTypes, ObjectPropertyInfo } from "./base/inspectorUtil";


export type CustomInspectorObjects = TowermodObject

export const customNumericSubtypeNames = [] as const
export const customStringSubtypeNames = [] as const

export function propertyInfoOverrides<T extends InspectorObjectValue>(obj: T, pinfo: PropertyInfo, key: InspectorKeyTypes) {
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
				imageIds: { hidden: true, },
			})
		break; case 'LayoutLayer':
			override(type, {
				id: { readonly: true },
				objects: { hidden: true },
			})
		break; case 'ObjectInstance':
			override(type, {
				id: { readonly: true },
				data: { hidden: true },
			})
	}

	function override<T extends InspectorObjectValue['type']>(_type: T, overrides: Partial<Record<keyof TypeNameToValue[T], Partial<PropertyInfo>>>) {
		Object.assign(pinfo, overrides[key])
	}
}

export function customProperties<T extends InspectorObjectValue>(obj: T, pinfo: PropertyInfo): PropertyInfo[] | undefined {
	switch (pinfo.type) {
		case 'ObjectType':
			return [
				{
					key: 'instances',
					get value() {
						// TODO
						return []
					},
					readonly: true,
					type: 'Array',
					valueTypes: new Set(['int']),
				}
			]
	}
	return undefined
}

export function getCustomComponent(pinfo1: PropertyInfo, onChange: (v: any) => void): React.ReactNode | undefined {
	if (typeof pinfo1.value === 'object' && pinfo1.type !== 'Record') {
		const pinfo: ObjectPropertyInfo = pinfo1 as any
		switch (pinfo.value.type) {
			case 'ObjectType':
				pinfo.key
		}
	}

	return undefined
}
