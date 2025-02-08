import { useEffect, useState } from 'react';
import { ModInfo } from '@towermod';
import Style from './Mods.module.scss'
import { api } from "@/api";
import { useAppDispatch } from '@/util/hooks';
import { win32 as path } from 'path';
import { toast } from '@/app/Toast';
import { openFolder, getModsDirPath } from '@/util/rpc';
import { Button } from '@/components/Button';
import { invoke } from '@tauri-apps/api/core';
import { LoadContainer } from '@/components/LoadContainer';
import { toastResult } from '@/components/Error';

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
	mods?: ModInfo[],
	selectedMod?: ModInfo
	setSelectedMod: (mod: ModInfo | undefined) => void,
}) {
	const { mods, selectedMod, setSelectedMod } = props;
	return <div className={Style.modList}>
		{mods?.map((mod, i) => <ModListItem
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
	const modsList = api.useGetInstalledModsQuery();
	modsList.error
	const [playMod] = api.usePlayModMutation();
	const [selectedMod, setSelectedMod] = useState<ModInfo>();

	return <div className={Style.mods}>
		<div className="hbox gap">
			<Button onClick={async () => {
				toastResult(modsList.refetch(), "Mods list reloaded")
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
			<LoadContainer info={modsList}>
				<ModList
					mods={modsList.data}
					selectedMod={selectedMod}
					setSelectedMod={setSelectedMod}
				/>
			</LoadContainer>
			<ModDetails
				mod={selectedMod}
			/>
		</div>
	</div>
}
