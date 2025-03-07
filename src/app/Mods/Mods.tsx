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
import { ErrorMsg } from '@/components/Error';
import { assert, posmod, triggerTransition } from '@/util/util';
import { useImperativeHandle, useObjectUrl, useStateRef } from '@/util/hooks';
import { spin } from '../GlobalSpinner';
import { Select } from '@/components/Select';
import { State, actions, dispatch, useAppSelector } from '@/redux';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';
import { awaitRtk } from '@/api/helpers';

const selectIsModRunning = createSelector((s: State) => s.app.runningMods, (_, modId: string) => modId, (runningMods, modId) => {
	return runningMods.includes(modId)
})

const selectModsGroupedByVersion = createSelector(
	(modsList: ModInfo[] | undefined) => modsList,
	(modsList) => {
		if (!modsList) { return }
		const mods: Record<string, ModInfo[]> = {}
		for (const mod of modsList) {
			const name = mod.uniqueName
			if (!mods[name]) { mods[name] = [] }
			mods[name].push(mod)
		}
		return mods
	}
)

const selectMod = createSelector(
	(modsList: ModInfo[] | undefined) => modsList,
	(_, modId?: string) => modId,
	(modsList?: ModInfo[], modId?: string) => {
		if (!modsList) { return }
		return modsList.find(m => m.id === modId)
	}
)

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

export function ModList() {
	const { data: allMods, isFetching, error } = api.useGetInstalledModsQuery();

	const selectedModId = useAppSelector(s => s.app.selectedModId)
	const selectedMod = useSelector(() => selectMod(allMods, selectedModId))

	const modsGroupedByVersion = useSelector(() => selectModsGroupedByVersion(allMods))

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
		dispatch(actions.selectMod(mods[modIdx].id))
	}

	const noMods = mods && mods.length === 0

	return <LoadContainer
		tabIndex={0}
		error={error}
		isLoading={isFetching}
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
				return <ModListItem
					key={key}
					mod={mod}
					selected={mod.id === selectedMod?.id}
					onClick={() => {
						dispatch(actions.selectMod(mod.id))
					}}
				/>
			})
		}
	</LoadContainer>
}

function ModDetails() {
	const [playMod] = api.usePlayModMutation();

	const { data: allMods } = api.useGetInstalledModsQuery();
	const modsGroupedByVersion = useSelector(() => selectModsGroupedByVersion(allMods))

	const modId = useAppSelector(s => s.app.selectedModId)
	const mod = useSelector(() => selectMod(allMods, modId))
	const modIsRunning = useAppSelector(s => selectIsModRunning(s, mod?.id ?? ""))
	const versions = mod && modsGroupedByVersion?.[mod.uniqueName]

	const { data: modCacheExists } = api.useModCacheExistsQuery(mod ?? skipToken);
	const [clearModCache] = api.useClearModCacheMutation();

	const [el, setEl] = useStateRef<HTMLDivElement>();

	useEffect(() => {
		triggerTransition(el, Style.init)
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
					<div className="subtle">— by {mod.author}</div>
				</div>
				<div className="grow" />
				<div className="vbox gap">
					<Select disabled={(versions?.length||0) <= 1} options={versions?.map(m => m.version) ?? []} value={mod?.version} onChange={(version) => {
						const mod = versions?.find(m => m.version === version)
						if (mod) { dispatch(actions.selectMod(mod.id)) }
					}} />
					<Text className={Style.date}>{mod.date.split('T')[0]}</Text>
				</div>
			</div>
			<img className={Style.logo} src={logo} />
			<Text>{mod.description}</Text>
			<div className="grow" />
			<div className="hbox gap">
				<Button disabled={modIsRunning} className="grow" onClick={async () => {
					const pid = await awaitRtk(spin(playMod(mod.filePath!)));
					assert(pid)
					toast(`Started "${mod.displayName}"`)

					dispatch(actions.setModRunning({ modId: mod.id, running: true }))
					await waitUntilProcessExits(pid)
					toast(`"${mod.displayName}" exited`)
					dispatch(actions.setModRunning({ modId: mod.id, running: false }))
				}}>
					{ modIsRunning ? "Running..." : "Play" }
				</Button>
				{ modCacheExists ?
					<Button disabled={modIsRunning} onClick={async () => {
						await awaitRtk(spin(clearModCache(mod)))
						toast(`Cleared cache for "${mod.displayName}"`)
					}}>
						Clear cache
					</Button>
				: null }
			</div>
		</div>
	}
}


export default function Mods() {
	const modsList = api.useGetInstalledModsQuery();
	const [playUnmodified] = api.usePlayVanillaMutation();

	return <div className="vbox gap grow isolation overflow-hidden">
		<div className="hbox gap">
			<Button onClick={async () => {
				await awaitRtk(spin(playUnmodified()))
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
				await awaitRtk(modsList.refetch())
				toast("Mods list reloaded")
			}}>
				Refresh
			</Button>
		</div>
		<div className="hbox gap grow overflow-hidden">
			<ModList />
			<ModDetails />
		</div>
	</div>
}
