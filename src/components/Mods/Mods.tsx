import { useContext, useState } from 'react';
import { ModInfo } from '@towermod';
import Style from './Mods.module.scss'
import Modal from '../Modal';
import { api } from "@/api";
import { useAppDispatch } from '@/hooks';
import { win32 as path } from 'path';
import { toast } from '@/components/Toast';
import { openFolder, getModsDirPath } from '@/rpc';
import { Button } from '../Button';

export const ModListItem = (props: {
	selected: boolean,
	mod: ModInfo,
} & React.ComponentProps<'div'>) => {
	const { selected, mod, ...htmlProps } = props;
	const fileName = path.basename(mod.filePath ?? "");
	return <div
		className={`${Style.modListItem} ${selected ? Style.selected : ""}`}
		{...htmlProps}
	>
		{
			mod.error ?
				<span className={Style.error}>
					{fileName}
				</span>
			:
				<>{mod.displayName} (by {mod.author})</>
		}
	</div>
}

export function ModList(props: {
	mods: ModInfo[],
	selectedMod?: ModInfo
	setSelectedMod: (mod: ModInfo | undefined) => void,
}) {
	const { mods, selectedMod, setSelectedMod } = props;
	return <div className={Style.modList}>
		{mods.map((mod, i) => <ModListItem
			key={mod.error ? `${mod.author}.${mod.name}.${mod.version}` : i}
			mod={mod}
			selected={mod === selectedMod}
			onClick={() => {
				setSelectedMod(mod)
			}}
		/>)}
	</div>
}

function ModDetails(props: {
	mod?: ModInfo,
	versions?: string[] | null,
	setSelectedVersion?: (version: string) => void,
}) {
	const { mod, versions, setSelectedVersion } = props;
	if (!mod) { return null }
	if (mod.error) {
		return <div className={Style.modDetails}>
			<pre><code className={Style.error}>
				{mod.error}
			</code></pre>
		</div>
	}
}

export default function Mods() {
	const { data: modsList } = api.useGetInstalledModsQuery();
	const [playMod] = api.usePlayModMutation();
	const [selectedMod, setSelectedMod] = useState<ModInfo>();
	const [showModal, setShowModal] = useState(false); // FIXME
	const dispatch = useAppDispatch();
	if (!modsList) { return null }

	if (showModal) {
		return <Modal requestClose={() => setShowModal(false)}>
			Hello there!!
		</Modal>
	}

	return <div className={Style.mods}>
		<div className="hbox gap">
			<Button onClick={() => {
				dispatch(api.util.invalidateTags(['ModInfo']))
				toast("Mod list reloaded")
			}}>
				Refresh mod list
			</Button>
			<Button disabled={!selectedMod || !!selectedMod.error} onClick={async () => {
				if (selectedMod?.filePath) {
					playMod(selectedMod.filePath)
				}
			}}>
				Play mod
			</Button>
			<Button onClick={async () => {
				openFolder(await getModsDirPath())
				toast('Opened mod directory')
			}}>
				Open mods folder
			</Button>
		</div>
		<div className="hbox gap">
			<ModList
				mods={modsList}
				selectedMod={selectedMod}
				setSelectedMod={setSelectedMod}
			/>
			<ModDetails
				mod={selectedMod}
			/>
		</div>
	</div>
}
