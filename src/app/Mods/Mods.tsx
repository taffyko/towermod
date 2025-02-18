import { useCallback, useEffect, useMemo, useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query/react'
import { ModInfo } from '@towermod';
import Style from './Mods.module.scss'
import Text from '@/components/Text'
import { api } from "@/api";
import { win32 as path } from 'path';
import { toast } from '@/app/Toast';
import { openFolder, getModsDirPath, waitUntilProcessExits } from '@/util/rpc';
import { Button } from '@/components/Button';
import { LoadContainer } from '@/components/LoadContainer';
import { ErrorMsg, throwOnError } from '@/components/Error';
import { assert, posmod } from '@/util/util';
import { useImperativeHandle, useObjectUrl, useStateRef } from '@/util/hooks';
import { spin } from '../GlobalSpinner';
import { Select } from '@/components/Select';
import { appContextStore } from '../App/appContext';

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
	handle: ModsHandle,
	isLoading?: boolean,
	error?: any,
}) {
	const { isLoading, handle, error } = props;

	const { mods: modsGroupedByVersion, selectedMod, setSelectedModId: setSelectedMod } = handle;

	const mods = useMemo(() => {
		if (!modsGroupedByVersion) { return }
		// populate the list using the last version of each mod
		return Object.values(modsGroupedByVersion).map((mods) => mods[mods.length - 1])
	}, [modsGroupedByVersion])


	function nextMod(offset: number) {
		if (!mods?.length) { return }
		let modIdx = mods.findIndex(m => m.id === selectedMod?.id);
		if (modIdx === -1) {
			modIdx = 0
		} else {
			modIdx = posmod(modIdx + offset, mods.length);
		}
		setSelectedMod(mods[modIdx].id)
	}

	const noMods = mods && mods.length === 0

	return <LoadContainer
		tabIndex={0}
		error={error}
		isLoading={isLoading}
		className={`${Style.modList} ${noMods ? 'centerbox' : ''}`}
		onKeyDown={e => {
			switch (e.key) {
				case 'ArrowDown': nextMod(1); break
				case 'ArrowUp': nextMod(-1); break
			}
		}}
	>
		{noMods ?
			<i>No mods installed</i>
		:
			mods?.map((mod, i) => {
				const key = mod.error ? i : mod.id;
				console.log("KEY", key)
				return <ModListItem
					key={key}
					mod={mod}
					selected={mod.id === selectedMod?.id}
					onClick={() => {
						setSelectedMod(mod.id)
					}}
				/>
			})
		}
	</LoadContainer>
}

function ModDetails(props: {
	handle: ModsHandle,
}) {
	const { handle } = props
	const { selectedMod: mod, selectedModVersions: versions, setSelectedModId: setSelectedVersion } = handle
	const [el, setEl] = useStateRef<HTMLDivElement>();
	const [playMod] = api.usePlayModMutation();
	const { data: modCacheExists } = api.useModCacheExistsQuery(mod ?? skipToken);
	const [clearModCache] = api.useClearModCacheMutation();

	useEffect(() => {
		el?.classList.add(Style.init)
		el?.offsetTop
		el?.classList.remove(Style.init)
	}, [mod])

	const icon = useObjectUrl(mod?.icon, { type: 'image/png' })
	const logo = useObjectUrl(mod?.cover, { type: 'image/png' })

	const modIsRunning = useMemo(() => {
		if (!mod) { return false }
		return handle.runningMods.includes(mod.id)
	}, [handle.runningMods, mod])

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
							setSelectedVersion?.(mod.id)
						}
					}} />
					<Text className={Style.date}>{mod.date.split('T')[0]}</Text>
				</div>
			</div>
			<img className={Style.logo} src={logo} />
			<Text>{mod.description}</Text>
			<div className="grow" />
			<div className="hbox gap">
				<Button disabled={modIsRunning} className="grow" onClick={async () => {
					const { data: pid } = await throwOnError(spin(playMod(mod.filePath!)));
					assert(pid)
					toast(`Started "${mod.displayName}"`)

					handle.setModRunning(mod.id, true);
					await waitUntilProcessExits(pid)
					appContextStore.lastValue?.mods?.setModRunning(mod.id, false)
				}}>
					{ modIsRunning ? "Running..." : "Play" }
				</Button>
				{ modCacheExists ?
					<Button disabled={modIsRunning} onClick={async () => {
						await throwOnError(spin(clearModCache(mod)))
						toast(`Cleared cache for "${mod.displayName}"`)
					}}>
						Clear cache
					</Button>
				: null }
			</div>
		</div>
	}
}


export interface ModsHandle {
	mods?: Record<string, ModInfo[]>,
	setSelectedModId(modId: string | undefined): void,
	selectedMod?: ModInfo,
	selectedModVersions?: ModInfo[],
	setDesiredSelectedModId(modId: string): void,
	runningMods: string[],
	setModRunning(modId: string, running: boolean): void,
}

export default function Mods(props: {
	handleRef?: React.Ref<ModsHandle>
}) {
	const modsList = api.useGetInstalledModsQuery();
	const [playUnmodified] = api.usePlayVanillaMutation();
	const [selectedModId, _setSelectedModId] = useState<string>();
	const [desiredSelectedModId, setDesiredSelectedModId] = useState<string>();
	const [runningMods, setRunningMods] = useState<string[]>([])

	const setModRunning = useCallback((modId: string, running: boolean) => {
		const idx = runningMods.indexOf(modId)
		const newRunningMods = [...runningMods]
		if (running && idx === -1) {
			newRunningMods.push(modId)
			setRunningMods(newRunningMods)
		} else if (!running && idx !== -1) {
			newRunningMods.splice(idx, 1)
			setRunningMods(newRunningMods)
		}
	}, [runningMods, setRunningMods])

	// mods grouped by version
	const mods = useMemo(() => {
		if (!modsList.data) { return }
		const mods: Record<string, ModInfo[]> = {}
		for (const mod of modsList.data) {
			const name = mod.uniqueName
			if (!mods[name]) { mods[name] = [] }
			mods[name].push(mod)
		}
		return mods
	}, [modsList.data])

	// selectedModId -> selectedMod
	const selectedMod = useMemo(() => {
		if (selectedModId && modsList.data) {
			return modsList.data.find(m => m.id === selectedModId)
		}
	}, [selectedModId, mods])
	// reset selection if data disappears
	useEffect(() => {
		if (!selectedMod) { _setSelectedModId(undefined) }
	}, [selectedMod])

	// clear desiredSelectedModId if the user manually selects something else
	const setSelectedModId = useCallback((id: string | undefined) => {
		_setSelectedModId(id)
		setDesiredSelectedModId(undefined)
	}, [_setSelectedModId, setDesiredSelectedModId]);
	// select desiredSelectedModId as soon as the mods list contains that mod
	useEffect(() => {
		if (desiredSelectedModId) {
			if (modsList.data?.find(m => m.id === desiredSelectedModId)) {
				setSelectedModId(desiredSelectedModId)
			}
		}
	}, [setSelectedModId, desiredSelectedModId, mods])

	// all available versions of the selected mod
	const selectedModVersions = useMemo(() => {
		if (!selectedMod || !mods) { return }
		return mods[selectedMod.uniqueName]
	}, [selectedMod, mods])

	const handle = useImperativeHandle(props.handleRef, () => ({
		mods,
		setSelectedModId,
		selectedMod,
		selectedModVersions,
		setDesiredSelectedModId,
		runningMods,
		setModRunning,
	}), [mods, setDesiredSelectedModId, selectedMod, selectedModVersions, setDesiredSelectedModId, runningMods, setModRunning])

	return <div className="vbox gap grow" style={{ isolation: 'isolate', overflow: 'hidden' }}>
		<div className="hbox gap">
			<Button onClick={async () => {
				await throwOnError(spin(playUnmodified()))
				toast("Game started")
			}}>
				Play unmodified
			</Button>
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
				handle={handle}
				error={modsList.error}
				isLoading={modsList.isFetching}
			/>
			<ModDetails
				handle={handle}
			/>
		</div>
	</div>
}
