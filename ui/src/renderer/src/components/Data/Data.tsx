import Outliner from './Outliner/Outliner'
import Inspector from './Inspector/Inspector'

export function Data() {
	return <div className="hbox grow">
		<Outliner />
		<Inspector />
	</div>
}
