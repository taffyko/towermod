import React from 'react'
import { TowermodObject } from "@shared/reducers/data";
import type { PropertyInfo, InspectorObjectValue, TypeNameToValue, InspectorKeyTypes } from "./base/inspectorUtil";
import { IdLink } from './IdLink';
import { ImageLink } from './ImageLink';


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

export function getCustomComponent(pinfo: PropertyInfo, onChange: (v: any) => void): React.ReactNode | undefined {
	const objPinfo = pinfo.parent;
	if (objPinfo && typeof objPinfo.value === 'object' && (objPinfo.type as any) !== 'Record') {
		const obj = pinfo.value as InspectorObjectValue
		const type = obj.type
		switch (type) {
			case 'AnimationFrame':
				switch (pinfo.key) {
					case 'imageId':
						return <ImageLink id={pinfo.value as any} />
				}
			break; case 'ObjectInstance':
				switch (pinfo.key) {
					case 'objectTypeId':
						return <IdLink lookup={{ type, id: pinfo.value as any }} />
				}
			break; case 'ObjectType':
				switch (pinfo.key) {
					case 'instances':
						return <IdLink lookup={{ type, id: pinfo.value as any }} />
				}
		}
	}

	return undefined
}
