import { useAppSelector } from "@renderer/hooks"
import { Outliner } from './Outliner'
import { TreePresenter } from './Outliner2'

export function Data() {
	return <TreePresenter itemSize={15} />
}

// const Outliner = () => {
// 	const plugins = useAppSelector(s => Object.entries(s.data.editorPlugins))

// 	if (!plugins.length) { return null }

// 	return <div>
// 		{plugins.map(([idx, plugin]) =>
// 			<div key={idx}>{idx}: {plugin.stringTable.name}</div>
// 		)}
// 	</div>
// }

const Inspector = () => {

}
