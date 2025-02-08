import { useEffect, useMemo, useState } from 'react';
import { ModInfo } from '@towermod';
import Style from './Mods.module.scss'
import Text from '@/components/Text'
import { api } from "@/api";
import { win32 as path } from 'path';
import { toast } from '@/app/Toast';
import { openFolder, getModsDirPath } from '@/util/rpc';
import { Button } from '@/components/Button';
import { LoadContainer } from '@/components/LoadContainer';
import { ErrorMsg, throwOnError, toastResult } from '@/components/Error';
import { posmod } from '@/util/util';
import { useObjectUrl, useStateRef } from '@/util/hooks';

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
				<>{mod.displayName}</>
		}
	</div>
}

export function ModList(props: {
	mods?: ModInfo[],
	isLoading?: boolean,
	error?: any,
	selectedMod?: string
	setSelectedMod: (mod: string | undefined) => void,
}) {
	const { mods, selectedMod, setSelectedMod, error, isLoading } = props;
	function nextMod(offset: number) {
		if (!mods?.length) { return }
		let modIdx = mods.findIndex(m => uniqueVersionName(m) === selectedMod);
		if (modIdx === -1) {
			modIdx = 0
		} else {
			modIdx = posmod(modIdx + offset, mods.length);
		}
		setSelectedMod(uniqueVersionName(mods[modIdx]))
	}
	return <LoadContainer
		tabIndex={0}
		error={error}
		isLoading={isLoading}
		className={Style.modList}
		onKeyDown={e => {
			switch (e.key) {
				case 'ArrowDown': nextMod(1); break
				case 'ArrowUp': nextMod(-1); break
			}
		}}
	>
		{mods?.map((mod, i) => <ModListItem
			key={mod.error ? i : uniqueVersionName(mod)}
			mod={mod}
			selected={uniqueVersionName(mod) === selectedMod}
			onClick={() => {
				setSelectedMod(uniqueVersionName(mod))
			}}
		/>)}
	</LoadContainer>
}

function ModDetails(props: {
	mod?: ModInfo,
	versions?: string[] | null,
	setSelectedVersion?: (version: string) => void,
}) {
	const { mod, versions, setSelectedVersion } = props;
	const [el, setEl] = useStateRef<HTMLDivElement>();
	const [playMod] = api.usePlayModMutation();

	useEffect(() => {
		el?.classList.add(Style.init)
		el?.offsetTop
		el?.classList.remove(Style.init)
	}, [mod])

	const icon = useObjectUrl(mod?.icon, { type: 'image/png' })
	const logo = useObjectUrl(mod?.cover, { type: 'image/png' })

	if (!mod) { return <div className={Style.modDetails} /> }
	if (mod.error) {
		return <div ref={setEl} className={Style.modDetails}>
			<ErrorMsg error={mod.error} />
		</div>
	}
	if (mod) {
		return <div ref={setEl} className={Style.modDetails}>
			<div className="hbox gap">
				{ icon ? <img className={Style.icon} src={icon} /> : null}
				<div className="vbox">
					<Text>{mod.displayName}</Text>
					<Text style={{ fontStyle: 'italic' }}>— by {mod.author}</Text>
				</div>
			</div>
			{ logo ? <img className={Style.logo} src={logo} /> : null}
			<Text>{mod.description}</Text>
			<div className="grow" />
			<Button onClick={async () => {
				await throwOnError(playMod(mod.filePath!))
				toast(`Started ${mod.displayName}`)
			}}>
				Play
			</Button>
		</div>
	}
}


function uniqueName(mod: ModInfo) {
	if (mod.error) { return mod.filePath! }
	return `${mod.author.toLowerCase()}.${mod.name.toLowerCase()}`
}
function uniqueVersionName(mod: ModInfo) {
	if (mod.error) { return mod.filePath! }
	return `${mod.author.toLowerCase()}.${mod.name.toLowerCase()}.${mod.version}`
}

export default function Mods() {
	const modsList = api.useGetInstalledModsQuery();
	const [playUnmodified] = api.usePlayVanillaMutation();
	const [selectedModId, setSelectedModId] = useState<string>();

	const selectedMod = useMemo(() => {
		if (selectedModId && modsList.data) {
			return modsList.data.find(m => uniqueVersionName(m) === selectedModId)
		}
	}, [selectedModId, modsList.data])

	useEffect(() => {
		if (!selectedMod) { setSelectedModId(undefined) }
	}, [selectedMod])


	return <div className="vbox gap grow" style={{ isolation: 'isolate', overflow: 'hidden' }}>
		<div className="hbox gap">
			<Button onClick={async () => {
				await throwOnError(playUnmodified())
				toast("Game started")
			}}>
				Play unmodified
			</Button>
			<div className="grow" />
			<Button onClick={async () => {
				openFolder(await getModsDirPath())
				toast("Opened mods directory")
			}}>
				Browse
			</Button>
			<Button disabled={modsList.isFetching} onClick={async () => {
				await throwOnError(modsList.refetch())
				toast("Mods list reloaded")
			}}>
				Refresh
			</Button>
		</div>
		<div className="hbox gap grow" style={{ overflow: 'hidden' }}>
			<ModList
				mods={modsList.data}
				selectedMod={selectedModId}
				setSelectedMod={setSelectedModId}
				error={modsList.error}
				isLoading={modsList.isFetching}
			/>
			<ModDetails
				mod={selectedMod}
			/>
		</div>
	</div>
}
