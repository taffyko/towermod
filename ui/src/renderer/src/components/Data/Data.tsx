import Outliner from './Outliner/Outliner'
import Inspector from './Inspector/Inspector'
import { InspectorObjectValue, inferPropertyInfoFromValue } from './Inspector/inspectorUtil'
import { useState } from 'react'

export function Data() {
	const [value, setValue] = useState<InspectorObjectValue | null>(null)
	return <div className="hbox gap grow">
		<Outliner
			onChange={(value) => setValue(value)}
		/>
		{ value ?
			<Inspector pinfo={inferPropertyInfoFromValue(value, 'root') as any} />
		: null }
	</div>
}
