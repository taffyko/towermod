import Outliner, { OutlinerHandle } from './Outliner/Outliner'
import Inspector from './Inspector/base/Inspector'
import { inferPropertyInfoFromValue } from './Inspector/base/inspectorUtil'
import { useState } from 'react'
import { UniqueObjectLookup, UniqueTowermodObject, actions, findObject } from '@/reducers/data'
import { useImperativeHandle, useStateRef } from '@/util/hooks'
import { useAppDispatch, useAppSelector } from '@/store'

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
		dispatch(actions.editObject(obj))
	}

	return <div className="hbox gap grow">
		<Outliner
			handleRef={setOutlinerRef}
			setValue={(value) => setSearchValue(value)}
		/>
		{ value ?
			<Inspector pinfo={inferPropertyInfoFromValue(value, undefined, 'root') as any} onChange={onChange as any} />
		: null }
	</div>
}
