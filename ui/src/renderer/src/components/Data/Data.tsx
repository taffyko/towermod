import Outliner from './Outliner/Outliner'
import Inspector from './Inspector/base/Inspector'
import { InspectorObjectValue, inferPropertyInfoFromValue } from './Inspector/base/inspectorUtil'
import { useState } from 'react'
import { UniqueTowermodObject, actions, findObjectSelector } from '@shared/reducers/data'
import { useAppDispatch, useAppSelector } from '@renderer/hooks'

export function Data() {
	const [searchValue, setSearchValue] = useState<UniqueTowermodObject | null>(null)
	const dispatch = useAppDispatch()
	const value = useAppSelector((state) => searchValue ? findObjectSelector(state.data, searchValue) : null)

	const onChange = (obj: UniqueTowermodObject) => {
		dispatch(actions.editObject(obj))
	}

	return <div className="hbox gap grow">
		<Outliner
			onChange={(value) => setSearchValue(value)}
		/>
		{ value ?
			<Inspector pinfo={inferPropertyInfoFromValue(value, 'root') as any} onChange={onChange as any} />
		: null }
	</div>
}
