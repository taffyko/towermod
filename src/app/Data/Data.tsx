import Outliner, { OutlinerHandle } from './Outliner/Outliner'
import Inspector from './Inspector/base/Inspector'
import { inferPropertyInfoFromValue } from './Inspector/base/inspectorUtil'
import { useEffect, useState } from 'react'
import { UniqueObjectLookup, UniqueTowermodObject, actions, dataActions, findObject } from '@/redux'
import { useImperativeHandle, useStateRef } from '@/util/hooks'
import { useAppDispatch, useAppSelector } from '@/redux'
import { api } from '@/api'
import { Button } from '@/components/Button'
import { spin } from '../GlobalSpinner'
import { throwOnError } from '@/components/Error'
import { toast } from '../Toast'
import { Toggle } from '@/components/Toggle'

export function Data() {
	const dispatch = useAppDispatch()
	const searchValue = useAppSelector((s) => s.app.outlinerValue);
	const value = useAppSelector((state) => searchValue ? findObject(state.data, searchValue) : null)

	const { data } = api.useGetDataQuery()
	useEffect(() => {
		if (data) {
			dispatch(actions.setData(data))
		}
	}, [data])



	const onChange = (obj: UniqueTowermodObject) => {
		dispatch(dataActions.editObject(obj))
	}

	return <div className="vbox gap grow">
		<PlayProject />
		<div className="hbox gap grow">
			<Outliner />
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
