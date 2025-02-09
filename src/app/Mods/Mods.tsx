import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { spin } from '../GlobalSpinner';
import { Select } from '@/components/Select';

export const ModListItem = (props: {
	selected: boolean,
	mod: ModInfo,
} & React.ComponentProps<'div'>) => {
	const { selected, mod, ...htmlProps } = props;

	const iconImg = useObjectUrl(mod.icon, { type: 'image/png' })

	const fileName = path.basename(mod.filePath ?? "");
	return <div
		className={`${Style.modListItem} ${selected ? Style.selected : ""}`}
		{...htmlProps}
	>
			<>
				{iconImg ? <img className={Style.icon} src={iconImg} /> : <div className={Style.icon} /> }
				{ mod.error ? <span className={Style.error}>{fileName}</span> : <span>{mod.displayName}</span> }
			</>
	</div>
}

export function ModList(props: {
	mods?: Record<string, ModInfo[]>,
	isLoading?: boolean,
	error?: any,
	selectedMod?: string
	setSelectedMod: (mod: string | undefined) => void,
}) {
	const { mods: modsGroupedByVersion, selectedMod, setSelectedMod, error, isLoading } = props;

	const mods = useMemo(() => {
		if (!modsGroupedByVersion) { return }
		// populate the list using the last version of each mod
		return Object.values(modsGroupedByVersion).map((mods) => mods[mods.length - 1])
	}, [modsGroupedByVersion])


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
	versions?: ModInfo[],
	setSelectedVersion?: (modId: string) => void,
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
				<div className="grow" />
				<div className="vbox gap">
					<Select disabled={(versions?.length||0) <= 1} options={versions?.map(m => m.version) ?? []} value={mod?.version} onChange={(version) => {
						const mod = versions?.find(m => m.version === version)
						if (mod && mod.filePath) {
							setSelectedVersion?.(uniqueVersionName(mod))
						}
					}} />
					<Text className={Style.date}>{mod.date.split('T')[0]}</Text>
				</div>
			</div>
			{ logo ? <img className={Style.logo} src={logo} /> : null}
			<Text>{mod.description}</Text>
			<div className="grow" />
			<Button onClick={async () => {
				await throwOnError(spin(playMod(mod.filePath!)))
				toast(`Started "${mod.displayName}"`)
			}}>
				Play
			</Button>
		</div>
	}
}

function uniqueName(mod: ModInfo | string) {
	if (typeof mod === 'string') {
		const [author, name] = mod.split('.')
		return `${author}.${name}`
	}
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

	// mods grouped by version
	const mods = useMemo(() => {
		if (!modsList.data) { return }
		const mods: Record<string, ModInfo[]> = {}
		for (const mod of modsList.data) {
			const name = uniqueName(mod)
			if (!mods[name]) { mods[name] = [] }
			mods[name].push(mod)
		}
		return mods
	}, [modsList.data])

	// selectedModId -> selectedMod
	const selectedMod = useMemo(() => {
		if (selectedModId && modsList.data) {
			return modsList.data.find(m => uniqueVersionName(m) === selectedModId)
		}
	}, [selectedModId, mods])
	// reset selection if data disappears
	useEffect(() => { if (!selectedMod) { setSelectedModId(undefined) } }, [selectedMod])

	const versions = useMemo(() => {
		if (!selectedMod || !mods) { return }
		return mods[uniqueName(selectedMod)]
	}, [selectedMod, mods])

	return <div className="vbox gap grow" style={{ isolation: 'isolate', overflow: 'hidden' }}>
		<div className="hbox gap">
			<Button onClick={async () => {
				await throwOnError(spin(playUnmodified()))
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
				mods={mods}
				selectedMod={selectedModId}
				setSelectedMod={setSelectedModId}
				error={modsList.error}
				isLoading={modsList.isFetching}
			/>
			<ModDetails
				mod={selectedMod}
				versions={versions}
				setSelectedVersion={setSelectedModId}
			/>
		</div>
	</div>
}
