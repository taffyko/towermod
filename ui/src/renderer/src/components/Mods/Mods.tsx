import { rpc } from '@renderer/util';
import { useAppSelector } from '@renderer/hooks';
import { useEffect, useState } from 'react';
import { ModInfo } from '@towermod';
import Style from './Mods.module.scss'
import Modal from '../Modal';

export function ModDetails(props: { mod: ModInfo }) {
	return <div className={Style.modDetails}>

	</div>

}

export const ModListItem = (props: {
	selected: boolean,
	mod: ModInfo,
} & React.ComponentProps<'div'>) => {
	const { selected, mod, ...htmlProps } = props;
	return <div
		className={`${Style.modListItem} ${selected ? Style.selected : ""}`}
		{...htmlProps}
	>
		{mod.displayName} (by {mod.author})
	</div>
}

export function ModList(props: {
	mods: ModInfo[],
	selectedMod?: ModInfo
	setSelectedMod: (mod: ModInfo | undefined) => void,
}) {
	const { mods, selectedMod, setSelectedMod } = props;
	return <div className={Style.modList}>
		{mods.map((mod) => <ModListItem
				key={`${mod.author}.${mod.name}.${mod.version}`}
				mod={mod}
				selected={mod === selectedMod}
				onClick={() => {
					setSelectedMod(mod)
				}}
		/>)}
	</div>
}


export default function Mods() {
	const modsList = useAppSelector(s => s.main?.modList);
	const [selectedMod, setSelectedMod] = useState<ModInfo>();
	if (!modsList) { return null }

	const [showModal, setShowModal] = useState(true);

	if (showModal) {
		return <Modal requestClose={() => setShowModal(false)}>
			Hello there!!
		</Modal>
	}

	return <div className={Style.mods}>
		<div>
			<button onClick={async () => {
				await rpc.loadModList()
			}}>
				reload mods
			</button>
			<button disabled={!modsList || !selectedMod} onClick={async () => {
				if (selectedMod?.filePath) {
					rpc.playMod(selectedMod.filePath)
				}
			}}>
				play mod
			</button>
		</div>
		<ModList
			mods={modsList}
			selectedMod={selectedMod}
			setSelectedMod={setSelectedMod}
		/>
	</div>
}
