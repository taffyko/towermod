import Outliner, { OutlinerHandle } from './Outliner/Outliner'
import Inspector from './Inspector/base/Inspector'
import { inferPropertyInfoFromValue } from './Inspector/base/inspectorUtil'
import { useState } from 'react'
import { UniqueObjectLookup, UniqueTowermodObject, dataActions, findObject } from '@/redux'
import { useImperativeHandle, useStateRef } from '@/util/hooks'
import { useAppDispatch, useAppSelector } from '@/redux'
import { api } from '@/api'
import { Button } from '@/components/Button'
import { spin } from '../GlobalSpinner'
import { throwOnError } from '@/components/Error'
import { toast } from '../Toast'
import { Toggle } from '@/components/Toggle'

export interface DataHandle {
	outliner: OutlinerHandle | null,
	setValue(v: UniqueObjectLookup | null): void,
	value: UniqueTowermodObject | null,
}

export function Data(props: {
	handleRef?: React.Ref<DataHandle>
}) {
	const [searchValue, setSearchValue] = useState<UniqueObjectLookup | null>(null)
	const dispatch = useAppDispatch()
	const value = useAppSelector((state) => searchValue ? findObject(state.data, searchValue) : null)

	const [outliner, setOutlinerRef] = useStateRef<OutlinerHandle>()
	useImperativeHandle(props.handleRef, () => {
		return {
			outliner,
			setValue: setSearchValue,
			value,
		}
	}, [outliner, value])

	const onChange = (obj: UniqueTowermodObject) => {
		dispatch(dataActions.editObject(obj))
	}

	return <div className="vbox gap grow">
		<PlayProject />
		<div className="hbox gap grow">
			<Outliner
				handleRef={setOutlinerRef}
				setValue={(value) => setSearchValue(value)}
			/>
			{ value ?
				<Inspector pinfo={inferPropertyInfoFromValue(value, undefined, 'root') as any} onChange={onChange as any} />
			: null }
		</div>
	</div>
}


function PlayProject() {
	const [playProject] = api.usePlayProjectMutation();
	const [debug, setDebug] = useState(false);
	return <div className="hbox gap">
		<Button onClick={onClickPlayProject}>Play</Button>
		<Toggle value={debug} onChange={setDebug}>Debug</Toggle>
	</div>

	async function onClickPlayProject() {
		await throwOnError(spin(playProject(debug)))
		toast("Project launched")
	}
}
