import Outliner, { OutlinerContext, OutlinerHandle } from './Outliner/Outliner'
import Inspector from './Inspector/base/Inspector'
import { inferPropertyInfoFromValue } from './Inspector/base/inspectorUtil'
import { useContext, useEffect, useState } from 'react'
import { UniqueObjectLookup, UniqueTowermodObject, actions, dataActions, findObject, store } from '@/redux'
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
	const { data: editorPlugins } = api.useGetEditorPluginsQuery()
	useEffect(() => {
		if (data && editorPlugins) {
			dispatch(actions.setData({ ...data, editorPlugins }))
		}
	}, [data, editorPlugins])


	const [outlinerRef, setOutlinerRef] = useStateRef<OutlinerHandle>();

	const onChange = (obj: UniqueTowermodObject) => {
		dispatch(dataActions.editObject(obj))
	}

	return <div className="vbox gap grow">
		<PlayProject />
		<OutlinerContext.Provider value={outlinerRef!}>
			<div style={{ overflow: 'hidden' }} className="hbox gap grow">
				<Outliner handleRef={setOutlinerRef} />
				{ value ?
					<div className="vbox grow" style={{ flexBasis: 0, overflow: 'hidden' }}>
						<Inspector pinfo={inferPropertyInfoFromValue(value, undefined, 'root') as any} onChange={onChange as any} />
					</div>
				: null }
			</div>
		</OutlinerContext.Provider>
	</div>
}


function PlayProject() {
	const [updateData] = api.useUpdateDataMutation()
	const [playProject] = api.usePlayProjectMutation();
	const [debug, setDebug] = useState(false);
	return <div className="hbox gap">
		<Button onClick={onClickPlayProject}>Play</Button>
		<Toggle value={debug} onChange={setDebug}>Debug</Toggle>
	</div>

	async function onClickPlayProject() {
		await throwOnError(spin(updateData(store.getState().data)))
		await throwOnError(spin(playProject(debug)))
		toast("Project launched")
	}
}
