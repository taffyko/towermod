import Outliner, { OutlinerContext, OutlinerHandle } from './Outliner/Outliner'
import Inspector from './Inspector/base/Inspector'
import { inferPropertyInfoFromValue } from './Inspector/base/inspectorUtil'
import { useEffect, useState } from 'react'
import { UniqueTowermodObject, actions, dataActions, dispatch, findObject, store } from '@/redux'
import { useStateRef } from '@/util/hooks'
import { useAppDispatch, useAppSelector } from '@/redux'
import { api } from '@/api'
import { Button } from '@/components/Button'
import { spin } from '../GlobalSpinner'
import { toast } from '../Toast'
import { Toggle } from '@/components/Toggle'
import { awaitRtk } from '@/api/helpers'
import { saveProject } from '@/appUtil'

export function Data() {
	const dispatch = useAppDispatch()
	const searchValue = useAppSelector((s) => s.app.outlinerValue);
	const value = useAppSelector((state) => searchValue ? findObject(state.data, searchValue) : null)

	const { data: backendData } = api.useGetDataQuery()
	const { data: editorPlugins } = api.useGetEditorPluginsQuery()
	useEffect(() => {
		if (backendData && editorPlugins) {
			dispatch(actions.setData({ ...backendData, editorPlugins }))
		}
	}, [backendData, editorPlugins])


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
	const [playProject] = api.usePlayProjectMutation()
	const { data: backendData } = api.useGetDataQuery()
	const [debug, setDebug] = useState(false)

	return <div className="hbox gap">
		<Button onClick={onClickPlayProject}>Play</Button>
		<Toggle value={debug} onChange={setDebug}>Debug</Toggle>
		<Button onClick={onClickSaveProject}>Save</Button>
	</div>

	async function onClickPlayProject() {
		await awaitRtk(spin(updateData(store.getState().data)))
		await awaitRtk(spin(playProject(debug)))
		toast("Project launched")
	}

	async function onClickSaveProject() {
		await saveProject()
	}
}
