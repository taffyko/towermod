import api from '@/api'
import { saveProject } from '@/appUtil'
import { Button } from '@/components/Button'
import { Toggle } from '@/components/Toggle'
import { useAppSelector } from '@/redux'
import { UniqueTowermodObject } from '@/util'
import { useOptimisticTwoWayBinding, useStateRef } from '@/util/hooks'
import { skipToken } from '@tanstack/react-query'
import { debounce } from 'lodash-es'
import { useState } from 'react'
import { spin } from '../GlobalSpinner'
import { toast } from '../Toast'
import Inspector from './Inspector/base/Inspector'
import { inferPropertyInfoFromValue } from './Inspector/base/inspectorUtil'
import Outliner, { OutlinerHandle } from './Outliner/Outliner'
import { OutlinerContext } from './Outliner/OutlinerContext'


const updateTowermodObjectDebounced = debounce(api.updateTowermodObject, 500, { leading: true  })

export function Data() {
	const searchValue = useAppSelector((s) => s.app.outlinerValue)
	const { data: externalValue } = api.getTowermodObject.useQuery(searchValue ?? skipToken)

	const [outlinerRef, setOutlinerRef] = useStateRef<OutlinerHandle>()

	const [value, setValue] = useOptimisticTwoWayBinding({ externalValue })
	const onChange = (obj: UniqueTowermodObject) => {
		setValue(obj)
		updateTowermodObjectDebounced(obj)
	}

	return <div className="vbox gap grow">
		<PlayProject />
		<OutlinerContext.Provider value={outlinerRef}>
			<div className="hbox gap grow">
				<Outliner ref={setOutlinerRef} />
				<div className="vbox grow" style={{ flexBasis: 0, overflow: 'hidden' }}>
					{ value ?
						<Inspector pinfo={inferPropertyInfoFromValue(value, undefined, 'root') as any} onChange={onChange as any} />
						: null }
				</div>
			</div>
		</OutlinerContext.Provider>
	</div>
}


function PlayProject() {
	const [debug, setDebug] = useState(false)

	return <div className="hbox gap">
		<Button onClick={onClickPlayProject}>Play</Button>
		<Toggle value={debug} onChange={setDebug}>Debug</Toggle>
		<Button onClick={onClickSaveProject}>Save</Button>
	</div>

	async function onClickPlayProject() {
		await spin(api.playProject(debug))
		toast("Project launched")
	}

	async function onClickSaveProject() {
		await saveProject()
	}
}
