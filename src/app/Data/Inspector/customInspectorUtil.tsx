import React, { Suspense } from 'react'
import { TowermodObject } from "@/util";
import type { AnyPropertyInfo, InspectorObjectValue, TypeNameToValue, InspectorKeyTypes, InspectorTypeName, ParentPropertyInfo, ObjectPropertyInfo } from "./base/inspectorUtil";
import { IdLink } from './IdLink';
import { ImageLink } from './ImageLink';
import { PrivateVariables } from './PrivateVariables';
import { DisableShaderWhen, FpsMode, LayerSamplerMode, LayerType, ResizeMode, SamplerMode, SimulateShadersMode, TextRenderingMode, TextureLoadingMode, VariableType } from '@towermod';
import { InspectorArray } from './base/Inspector';
import { ObjectInstances, PluginName } from './MiscInspectorComponents';
import { SpinBox } from '@/components/SpinBox';


export type CustomInspectorObjects = TowermodObject

export const customNumericSubtypeNames = [] as const

export const customEnumSubtypes: Record<keyof CustomEnumToValue, string[]> = {
	TextureLoadingMode: ['LoadOnAppStart', 'LoadOnLayoutStart'],
	TextRenderingMode: ['Aliased', 'AntiAliased', 'ClearType'],
	ResizeMode: ['Disabled', 'ShowMore', 'Stretch'],
	SamplerMode: ['Point', 'Linear'],
	SimulateShadersMode: ['NoSimulation', 'Ps14', 'Ps11', 'Ps00'],
	LayerSamplerMode: ['Default', 'Point', 'Linear'],
	LayerType: ['Normal', 'WindowCtrls', 'NonFrame', 'Include'],
	DisableShaderWhen: ['NoSetting', 'Ps20Unavailable', 'Ps20Available', 'Ps14Unavailable', 'Ps14Available', 'Ps11Unavailable', 'Ps11Available'],
	FpsMode: ['VSync', 'Unlimited', 'Fixed'],
	VariableType: ['Number', 'String'],
}
export const customStringSubtypeNames = Object.getOwnPropertyNames(customEnumSubtypes) as (keyof CustomEnumToValue)[]

export type CustomEnumToValue = {
	TextureLoadingMode: TextureLoadingMode
	TextRenderingMode: TextRenderingMode
	ResizeMode: ResizeMode
	SamplerMode: SamplerMode
	SimulateShadersMode: SimulateShadersMode
	LayerSamplerMode: LayerSamplerMode
	LayerType: LayerType
	DisableShaderWhen: DisableShaderWhen
	VariableType: VariableType,
	FpsMode: FpsMode,
}

/** Provide additional virtual properties for each type, to display in the inspector */
export function getCustomProperties(objPinfo: ObjectPropertyInfo): string[] | undefined {
	const type = objPinfo.value['_type']
	switch (type) {
		case 'ObjectType':
			return ['instances', 'plugin']
	}
	return undefined
}

/** Override the inspector component returned for certain properties of certain types */
export function getCustomComponent(pinfo: AnyPropertyInfo, onChange: (v: any) => void): React.ReactNode | undefined {
	const parentPinfo = pinfo.parent
	let objPinfo = parentPinfo
	let collectionElement = false
	let key = pinfo.key
	if (parentPinfo?.type === 'Dictionary' || parentPinfo?.type === 'Array') {
		collectionElement = true
		objPinfo = parentPinfo.parent
		key = parentPinfo.key
	}
	if (parentPinfo && objPinfo && typeof objPinfo.value === 'object' && (objPinfo.type as any) !== 'Dictionary') {
		const obj = objPinfo.value as InspectorObjectValue
		const type = obj._type
		switch (type) {
			case 'AnimationFrame':
				switch (key) {
					case 'imageId':
						return <ImageLink id={pinfo.value as any} />
				}
			break; case 'ObjectInstance':
				switch (key) {
					case 'objectTypeId':
						return <IdLink lookup={{ _type: 'ObjectType', id: pinfo.value as any }} />
					// case 'privateVariables':
						// return <PrivateVariables pinfo={pinfo as any} />
				}
			break; case 'ObjectType':
				switch (key) {
					case 'instances':
						return <Suspense fallback={<SpinBox />}>
							<ObjectInstances objectType={obj} />
						</Suspense>
					break; case 'plugin':
						return <PluginName pluginId={obj.pluginId} />
				}
			break; case 'Behavior':
				switch (key) {
					case 'objectTypeId':
						return <IdLink lookup={{ _type: 'ObjectType', id: pinfo.value as any }} />
				}
			break; case 'Family':
				switch (key) {
					case 'objectTypeIds':
						if (collectionElement) {
							return <IdLink lookup={{ _type: 'ObjectType', id: pinfo.value as any }} onChange={(lookup: any) => onChange(lookup.id)} />
						}
				}
			break; case 'ObjectTrait':
				switch (key) {
					case 'objectTypeIds':
						if (collectionElement) {
							return <IdLink lookup={{ _type: 'ObjectType', id: pinfo.value as any }} onChange={(lookup: any) => onChange(lookup.id)} />
						}
				}
			break; case 'Container':
				switch (key) {
					case 'objectIds':
						if (collectionElement) {
							return <IdLink lookup={{ _type: 'ObjectType', id: pinfo.value as any }} onChange={(lookup: any) => onChange(lookup.id)} />
						}
				}
		}
	}

	return undefined
}

export function defaultValueForType<T extends InspectorTypeName>(type: T): undefined | (() => TypeNameToValue[T])
export function defaultValueForType(type: InspectorTypeName): (() => any) {
	switch (type) {
		case 'number': case 'int': case 'float': return () => 0
		case 'string': return () => ""
		case 'boolean': return () => false
		case 'ActionPoint': return () => ({ _type: 'ActionPoint', x: 0, y: 0, angle: 0, string: "" })
		case 'VariableType': return () => 'Number'
		case 'AnimationFrame': return () => ({ _type: 'AnimationFrame', imageId: 0, duration: 0 })
		case 'BehaviorControl': return (): TypeNameToValue['BehaviorControl'] => ({ _type: 'BehaviorControl', name: "name", vk: 0, player: 0 })
		case 'GlobalVariable': return (): TypeNameToValue['GlobalVariable'] => ({ _type: 'GlobalVariable', name: "name", varType: 0, value: "" })
	}
	throw new Error(`No default value defined for ${type}`)
}

/** Provides additional property type/metadata information for each type */
export function applyPropertyInfoOverrides<T extends InspectorObjectValue>(obj: T, pinfo: AnyPropertyInfo, key: InspectorKeyTypes) {
	const type = obj['_type'];
	switch (type) {
		case 'Animation':
			override(type, {
				id: { type: 'int', readonly: true },
				frames: { valueTypes: ['AnimationFrame'] },
				tag: { type: 'int' },
				repeatCount: { type: 'int' },
				repeatTo: { type: 'int' },
			})
		break; case 'AnimationFrame':
			override(type, {
				imageId: { type: 'int' },
				duration: { type: 'float' },
			})
		break; case 'Layout':
			override(type, {
				name: { readonly: true },
				imageIds: { hidden: true, },
				dataKeys: { valueTypes: ['string', 'int'] },
				textureLoadingMode: { type: 'TextureLoadingMode' },
				width: { type: 'int' },
				height: { type: 'int' },
				color: { type: 'int' },
			})
		break; case 'LayoutLayer':
			override(type, {
				layerType: { type: 'LayerType' },
				sampler: { type: 'LayerSamplerMode' },
				id: { type: 'int', readonly: true },
				filterColor: { type: 'int' },
				backgroundColor: { type: 'int' },
			})
		break; case 'ObjectInstance':
			let dataPinfo: Partial<AnyPropertyInfo> = { hidden: true }
			if (!(obj.data instanceof Array)){
				dataPinfo = { type: obj.data._type }
			}
			override(type, {
				id: { type: 'int', readonly: true },
				data: dataPinfo,
				objectTypeId: { type: 'int' },
				x: { type: 'int' },
				y: { type: 'int' },
				width: { type: 'int' },
				height: { type: 'int' },
				filter: { type: 'int' },
				key: { type: 'int' },
			})
		break; case 'ObjectType':
			override(type, {
				id: { type: 'int', readonly: true },
				pluginId: { hidden: true },
				descriptors: { hidden: true, },
				privateVariables: { valueTypes: ['VariableType'], readonly: true },
				destroyWhen: { type: 'DisableShaderWhen' }
			})
		break; case 'Behavior':
			override(type, {
				objectTypeId: { readonly: true },
				newIndex: { type: 'int', readonly: true },
				movIndex: { type: 'int', readonly: true },
				data: { hidden: true },
				descriptors: { hidden: true, }
			})
		break; case 'BehaviorControl':
			override(type, {
				vk: { type: 'int' },
				player: { type: 'int' },
			})
		break; case 'Container':
			override(type, {
				objectIds: { valueTypes: ['int'] }
			})
		break; case 'Family':
			override(type, {
				name: { readonly: true },
				objectTypeIds: { valueTypes: ['int'] },
				privateVariables: { valueTypes: ['VariableType'], readonly: true },
			})
		break; case 'ImageMetadata':
			override(type, {
				id: { readonly: true },
				collisionMask: { hidden: true },
				collisionPitch: { readonly: true },
				collisionWidth: { readonly: true },
				collisionHeight: { readonly: true },
				apoints: { valueTypes: ['ActionPoint'] },
			})
		break; case 'ActionPoint':
			override(type, {
				x: { type: 'int' },
				y: { type: 'int' },
			})
		break; case 'ObjectTrait':
			override(type, {
				name: { readonly: true },
				objectTypeIds: { valueTypes: ['int'] },
			})
		break; case 'AppBlock':
			override(type, {
				dataKeys: { valueTypes: ['string', 'int'] },
				behaviorControls: { valueTypes: ['BehaviorControl'] },
				globalVariables: { valueTypes: ['GlobalVariable'] },
				fpsMode: { type: 'FpsMode' },
				samplerMode: { type: 'SamplerMode' },
				simulateShaders: { type: 'SimulateShadersMode' },
				textRenderingMode: { type: 'TextRenderingMode' },
				resizeMode: { type: 'ResizeMode' },
				textureLoadingMode: { type: 'TextureLoadingMode' },
				windowHeight: { type: 'int' },
				windowWidth: { type: 'int' },
				fps: { type: 'int' },
				fpsInCaption: { type: 'int' },
				motionBlurSteps: { type: 'int' },
				layoutIndex: { type: 'int' },
				multisamples: { type: 'int' },
			})
	}

	function override<T extends InspectorObjectValue['_type']>(_type: T, overrides: Partial<Record<keyof TypeNameToValue[T], Partial<AnyPropertyInfo>>>) {
		Object.assign(pinfo, (overrides as any)[key])
	}
}

