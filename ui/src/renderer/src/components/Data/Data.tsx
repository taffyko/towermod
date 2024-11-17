import Outliner from './Outliner/Outliner'
import Inspector from './Inspector/Inspector'
import { InspectorObjectValue, getPropertyInfos, inferPropertyInfoFromValue } from './Inspector/inspectorUtil'
import { useState } from 'react'
console.log(getPropertyInfos)

export function Data() {
	const [value, setValue] = useState<InspectorObjectValue | null>(null)
	return <div className="hbox grow">
		<Outliner />
		{ value ?
			<Inspector pinfo={inferPropertyInfoFromValue(value, 'root') as any} />
		: null }
	</div>
}
