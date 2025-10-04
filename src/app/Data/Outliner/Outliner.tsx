
import api from '@/api'
import { spin } from '@/app/GlobalSpinner'
import { DropdownMenu, ToggleMenuItem } from '@/components/DropdownMenu'
import IconButton from '@/components/IconButton'
import { Image } from '@/components/Image/Image'
import { LineEdit } from '@/components/LineEdit'
import arrowDownImg from '@/icons/arrowDown.svg'
import arrowRightImg from '@/icons/arrowRight.svg'
import plusImg from '@/icons/plus.svg'
import { actions, dispatch, useAppSelector } from '@/redux'
import { getObjectStringId, OutlinerTowermodObject, towermodObjectIdsEqual, UniqueObjectLookup, UniqueTowermodObject } from '@/util'
import { setRef, useImperativeHandle, useRerender, useStateRef, useWatchValue } from '@/util/hooks'
import { enumerate, posmod } from '@/util/util'
import { createSelector } from '@reduxjs/toolkit'
import { skipToken } from '@tanstack/react-query'
import clsx from 'clsx'
import { debounce } from 'lodash-es'
import { use, useCallback, useEffect, experimental_useEffectEvent as useEffectEvent, useRef, useState } from 'react'
import {
	FixedSizeNodeData,
	FixedSizeTree,
	NodeComponentProps,
	FixedSizeNodePublicState as NodePublicState,
	NodeRecord,
	TreeWalker,
	TreeWalkerValue
} from 'react-vtree'
import Style from './Outliner.module.scss'
import { OutlinerContext } from './OutlinerContext'
import { TreeComponent } from './Tree'
import { batchSetTreeItemChildren, getTreeItemChildren, getTreeItemId, jumpToTreeItem, setOpenRecursive } from './treeUtil'

export function Outliner(props: OutlinerProps) {
	const [handle, setHandle] = useStateRef<OutlinerHandle>()
	return <div className="vbox grow">
		<OutlinerContext.Provider value={handle!}>
			<div className="hbox gap">
				<OutlinerSearch />
				<div className="grow" />
				<OutlinerHistoryButtons />
			</div>
			<OutlinerTree ref={(r) => { setRef(props.ref, r); setHandle(r) }} />
		</OutlinerContext.Provider>
	</div>
}

export default Outliner

// function getObjChildren(obj: OutlinerTowermodObject): undefined | OutlinerTowermodObject[] {
// 	switch (obj._type) {
// 		case 'Layout': {
// 			return api.getLayoutLayers.requestCache(obj.name) ?? []
// 		} case 'LayoutLayer': {
// 			return api.getObjectInstances.requestCache(obj.id) ?? []
// 		}
// 	}
// }

type OutlinerNodeData = FixedSizeNodeData &
	{
		name?: string;
		nestingLevel: number;
		obj: OutlinerTowermodObject | null;
		children?: OutlinerTowermodObject[];
		idx: number | null,
	}

type RootContainerName = 'Layouts' | 'Animations' | 'Behaviors' | 'Containers' | 'Families' | 'Object Types' | 'Traits'

const getRootContainerData = (name: RootContainerName, children: OutlinerTowermodObject[]): TreeWalkerValue<OutlinerNodeData, OutlinerNodeMeta> => {
	return {
		data: {
			id: `root-${name}`,
			isOpenByDefault: false,
			name,
			children,
			nestingLevel: 0,
			obj: null,
			idx: null,
		},
		nestingLevel: 0
	}
}

const getNodeData = (
	obj: OutlinerTowermodObject,
	idx: number,
	nestingLevel: number,
	_tree: FixedSizeTree<OutlinerNodeData> | null,
): TreeWalkerValue<OutlinerNodeData, OutlinerNodeMeta> => {
	const id: string | number = getTreeItemId(obj)

	// const children = getObjChildren(obj)

	const data: OutlinerNodeData = {
		id,
		// children,
		isOpenByDefault: false,
		nestingLevel,
		obj,
		idx,
	}

	return {
		data,
		nestingLevel,
	}
}


const defaultTextStyle = {marginLeft: 10}
const defaultButtonStyle = {fontFamily: 'Courier New'}

type OutlinerNodeMeta = Readonly<{
	nestingLevel: number;
}>

function getAddChildImplementation(obj?: UniqueTowermodObject): (() => Promise<void>) | undefined {
	switch (obj?._type) {
		case 'ObjectType':
			if (obj.pluginName === 'Sprite') {
				return async () => {
					const id = await spin(api.createAnimation({ objectTypeId: obj.id }))
					dispatch(actions.setOutlinerValue({ _type: 'Animation', id }))
				}
			}
	}
}

type TreeNodeComponentProps = NodeComponentProps<OutlinerNodeData, NodePublicState<OutlinerNodeData>>
const TreeNodeComponent = (props: TreeNodeComponentProps) => {
	const {data: {name: nameOverride, nestingLevel, obj, idx, id}, isOpen, style, setOpen} = props
	const context = use(OutlinerContext)
	const tree = context?.tree
	const selectable = !!obj

	const { data } = api.getOutlinerObjectData.useQuery({ lookup: obj, idx })
	const { obj: objData, hasIcon, iconUrl, displayName, children } = data ?? {}

	const name = nameOverride ?? displayName
	const selected = useAppSelector(s => towermodObjectIdsEqual(s.app.outlinerValue, obj))

	// synchronize tree children with latest children from API
	useEffect(() => {
		if (children && children.length) {
			context?.setTreeItemChildren(children, id)
		}
	}, [children, context, id])

	const nodeRecord = tree?.state.records.get(props.data.id)
	const isLeaf = !nodeRecord?.child

	const addChild = getAddChildImplementation(objData)

	const nodeContent = <>
		<Image noReflow={hasIcon} src={iconUrl} />
		<div className="text" style={defaultTextStyle}>{name}</div>
	</>

	return <div
		className={clsx(
			Style.treeItem,
			selectable && Style.selectable,
			selected && Style.active,
			'group',
		)}
		onClick={() => {
			if (selectable) {
				dispatch(actions.setOutlinerValue(obj))
			}
		}}
		style={{
			...style,
			alignItems: 'center',
			display: 'flex',
			marginLeft: nestingLevel * 30,
		}}
	>
		{!isLeaf && (
			<div className={Style.expandButton}>
				<IconButton
					src={isOpen ? arrowDownImg : arrowRightImg}
					onMouseDown={(e) => {
						if (e.shiftKey && tree) {
							setOpenRecursive(tree, props.data.id, !isOpen)
						} else {
							setOpen(!isOpen)
						}
					}}
					onClick={e => e.stopPropagation()}
					style={defaultButtonStyle}
				/>
			</div>
		)}
		<div
			className={clsx(
				Style.treeItemContent,
				!name && 'opacity-0',
			)}
		>
			{nodeContent}
		</div>
		<div className="w-1" />
		{ addChild ?
			<IconButton
				onClick={e => {
					e.stopPropagation()
					addChild?.()
				}}
				src={plusImg}
				className={clsx(
					!selected && 'opacity-0',
					'group-hover:opacity-100 transition-opacity ease-[cubic-bezier(0,0.1,0,1)]',
				)}
			/>
			: null }
	</div>
}

export interface OutlinerHandle {
	tree: FixedSizeTree<OutlinerNodeData>
	jumpToItem(obj: UniqueObjectLookup): void
	hasItem(obj: UniqueObjectLookup): boolean
	setOpen(obj: UniqueObjectLookup, open: boolean): void
	setOpenRecursive(obj: UniqueObjectLookup, open: boolean): void
	setTreeItemChildren(items: OutlinerTowermodObject[], parentId: string, merge?: boolean): Promise<void>
	addToTree(item: UniqueObjectLookup): Promise<undefined | NodeRecord<NodePublicState<OutlinerNodeData>>>
}

export interface OutlinerProps {
	ref?: React.Ref<OutlinerHandle>,
}

function OutlinerTree(props: OutlinerProps) {
	const layouts = api.getLayouts.useQuery().data || []
	const behaviors = api.getBehaviors.useQuery().data || []
	const containers = api.getContainers.useQuery().data || []
	const families = api.getFamilies.useQuery().data || []
	const objectTypes = api.getObjectTypes.useQuery().data || []
	const traits = api.getObjectTraits.useQuery().data || []
	const appBlock = api.getAppBlock.useQuery().data
	const [tree, setTreeRef] = useStateRef<FixedSizeTree<OutlinerNodeData>>()
	//@ts-ignore
	window.tree = tree
	const lookup = useAppSelector(s => s.app.outlinerValue)
	const rerender = useRerender()

	const queuedTreeItemUpdates = useRef<Record<string, OutlinerNodeData[]>>({})
	const _dispatchTreeItemUpdatesPromiseResolvers: (() => void)[] = []
	const _dispatchTreeItemUpdates = debounce((tree: FixedSizeTree<OutlinerNodeData>) => {
		batchSetTreeItemChildren(tree, queuedTreeItemUpdates.current)
		queuedTreeItemUpdates.current = {}
		for (const resolve of _dispatchTreeItemUpdatesPromiseResolvers) { resolve() }
		_dispatchTreeItemUpdatesPromiseResolvers.splice(0)
		rerender()
	}, 5, { trailing: true })

	const handle = useImperativeHandle(props.ref, () => {
		return {
			tree: tree!,
			jumpToItem(obj) {
				const treeItemId = getTreeItemId(obj)
				if (tree) { jumpToTreeItem(tree, treeItemId) }
			},
			hasItem(obj) {
				if (tree) {
					const treeItemId = getTreeItemId(obj)
					if (tree.state.records.get(treeItemId)) {
						return true
					}
				}
				return false
			},
			setOpen(obj, open: boolean) {
				const treeItemId = getTreeItemId(obj)
				tree?.recomputeTree({ [treeItemId]: open })
			},
			setOpenRecursive(obj, open: boolean) {
				const treeItemId = getTreeItemId(obj)
				setOpenRecursive(tree!, treeItemId, open)
			},
			setTreeItemChildren(items: OutlinerTowermodObject[], parentId: string, merge = false): Promise<void> {
				if (!tree) {
					console.error('Called setTreeItemChildren without tree')
					return Promise.resolve()
				}
				const parent = tree.state.records.get(parentId)
				if (!parent) {
					console.error('Called setTreeItemChildren with invalid parentId',)
					return Promise.resolve()
				}

				const children: OutlinerNodeData[] = []
				if (merge) {
					children.push(...getTreeItemChildren(tree, parentId))
				}
				children.push(...items.map((item, idx) => (
					getNodeData(item, idx, parent.public.data.nestingLevel + 1, tree).data
				)))
				queuedTreeItemUpdates.current[parentId] = children
				const {promise, resolve} = Promise.withResolvers<void>()
				_dispatchTreeItemUpdatesPromiseResolvers.push(resolve)
				_dispatchTreeItemUpdates(tree)
				return promise
			},
			async addToTree(item: OutlinerTowermodObject): Promise<undefined | NodeRecord<NodePublicState<OutlinerNodeData>>> {
				const ancestors: { obj?: UniqueTowermodObject, children?: OutlinerTowermodObject[] }[] = []
				ancestors.push(await api.getOutlinerObjectData({ lookup: item, idx: null }) as any)
				while (true) {
					// walk up ancestors until a root present within the tree is found
					const obj1 = await api.getOutlinerParentObject(item)
					const { obj, children } = await api.getOutlinerObjectData({ lookup: obj1!, idx: null })
					if (!obj) {
						console.error("Failed to find ancestor for", item)
						return
					}
					ancestors.push({ obj, children })
					if (handle.hasItem(obj)) {
						break
					}
					item = obj
				}

				// set children at each layer starting from the root ancestor (ancestor already in the tree)
				const rootAncestor = ancestors.pop()!
				let parentId = getObjectStringId(rootAncestor.obj)
				let children = rootAncestor.children
				ancestors.reverse()
				for (const ancestor of ancestors) {
					await handle.setTreeItemChildren(children || [], parentId)
					parentId = getObjectStringId(ancestor.obj)
					children = ancestor.children
				}
				return tree?.state.records.get(getObjectStringId(item))
			}
		} as OutlinerHandle
	}, [tree, _dispatchTreeItemUpdates])

	// const hasItem = useMemo(() => {
	// 	return lookup ? handle.hasItem(lookup) : false
	// }, [tree?.state.records.size])
	const hasItem = lookup ? handle.hasItem(lookup) : false

	// BUGFIX: If the currently selected item is not loaded in the tree,
	// find and load it and the necessary ancestors.
	useWatchValue(() => {
		if (lookup) {
			if (hasItem) {
				handle.jumpToItem(lookup)
			} else {
				handle.addToTree(lookup)
			}
		}
	}, [lookup, hasItem])

	const treeWalker = useCallback(function*(): ReturnType<TreeWalker<OutlinerNodeData, OutlinerNodeMeta>> {
		yield getRootContainerData('Layouts', layouts)
		yield getRootContainerData('Behaviors', behaviors)
		yield getRootContainerData('Containers', containers)
		yield getRootContainerData('Families', families)
		yield getRootContainerData('Object Types', objectTypes)
		yield getRootContainerData('Traits', traits)
		if (appBlock) { yield getNodeData(appBlock, 0, 0, tree) }

		while (true) {
			const parentMeta = yield
			for (const [child, i] of enumerate(parentMeta.data.children ?? [])) {
				yield getNodeData(child, i, parentMeta.nestingLevel + 1, tree)
			}
		}
	}, [layouts, behaviors, containers, families, objectTypes, traits, appBlock, tree])

	return <TreeComponent
		treeWalker={treeWalker}
		itemSize={25}
		treeRef={setTreeRef}
	>
		{TreeNodeComponent}
	</TreeComponent>
}

function OutlinerSearch() {
	const [caseSensitive, setCaseSensitive] = useState(false)
	const [searchObjectTypes, setSearchObjectTypes] = useState(true)
	const [searchObjectInstances, setSearchObjectInstances] = useState(false)
	const [searchLayoutLayers, setSearchLayoutLayers] = useState(false)
	const [searchContainers, setSearchContainers] = useState(false)
	const [search, setSearch, matchIdx, matchCount, nextMatch] = useOutlinerSearch({
		caseSensitive,
		searchObjectTypes,
		searchObjectInstances,
		searchLayoutLayers,
		searchContainers,
	})

	return <>
		<LineEdit className="z-1 flex-shrink" placeholder="Search..." onChange={e => setSearch(e.target.value)} value={search}
			onKeyDown={e => {
				if (e.code === 'ArrowDown' || e.code === 'Enter') nextMatch(1)
				else if (e.code === 'ArrowUp') nextMatch(-1)
			}}
		>
			{search ?
				matchCount !== 0
					? matchIdx === -1 ? null : <div>{`${matchIdx+1}/${matchCount}`}</div>
					: <div className="text-(--color-error)">0/0</div>
				: null }
		</LineEdit>
		<DropdownMenu label="Filter">
			<ToggleMenuItem value={caseSensitive} onChange={setCaseSensitive}>Case sensitive</ToggleMenuItem>
			<ToggleMenuItem value={searchObjectTypes} onChange={setSearchObjectTypes}>Search object types</ToggleMenuItem>
			<ToggleMenuItem value={searchObjectInstances} onChange={setSearchObjectInstances}>Search object instances</ToggleMenuItem>
			<ToggleMenuItem value={searchLayoutLayers} onChange={setSearchLayoutLayers}>Search layers</ToggleMenuItem>
			<ToggleMenuItem value={searchContainers} onChange={setSearchContainers}>Search containers</ToggleMenuItem>
		</DropdownMenu>
	</>
}

const outlinerHistorySelector = createSelector(
	s => s.app.outlinerHistory,
	s => s.app.outlinerHistoryIdx,
	(outlinerHistory: unknown[], outlinerHistoryIdx: number) => {
		const first = outlinerHistoryIdx === 0
		const last = outlinerHistoryIdx === outlinerHistory.length - 1
		return [first, last]
	}
)

function OutlinerHistoryButtons() {
	const [first, last] = useAppSelector(outlinerHistorySelector)
	return <>
		<IconButton disabled={first} flip src={arrowRightImg} onClick={() => {
			dispatch(actions.outlinerHistoryNext(-1))
		}} />
		<IconButton disabled={last} src={arrowRightImg} onClick={() => {
			dispatch(actions.outlinerHistoryNext(1))
		}}/>
	</>
}

const emptyArray = [] as const

function useOutlinerSearch(options: {
	caseSensitive: boolean,
	searchObjectTypes: boolean,
	searchObjectInstances: boolean,
	searchLayoutLayers: boolean,
	searchContainers: boolean,
}) {
	const { caseSensitive, searchObjectTypes, searchObjectInstances, searchLayoutLayers, searchContainers } = options
	const lookup = useAppSelector(s => s.app.outlinerValue)
	const [search, _setSearch] = useState("")
	const shouldSelectFirstResult = useRef(false)
	function setSearch(search: string) {
		_setSearch(search)
		shouldSelectFirstResult.current = true
	}
	const searchOptions = search ? {
		text: caseSensitive ? search : search.toLowerCase(),
		caseSensitive
	} : undefined
	const matchedObjectTypes = api.searchObjectTypes.useQuery((searchObjectTypes && searchOptions) || skipToken).data || emptyArray
	const matchedLayoutLayers = api.searchLayoutLayers.useQuery((searchLayoutLayers && searchOptions) || skipToken).data || emptyArray
	const matchedObjectInstances = api.searchObjectInstances.useQuery((searchObjectInstances && searchOptions) || skipToken).data || emptyArray
	const matchedContainers = api.searchContainers.useQuery((searchContainers && searchOptions) || skipToken).data || emptyArray


	const matched: Record<string, UniqueObjectLookup> = {}
	if (search) {
		let count = 0
		for (const obj of matchedObjectTypes) {
			matched[getTreeItemId(obj)] = obj
			++count
		}
		for (const obj of matchedLayoutLayers) {
			matched[getTreeItemId(obj)] = obj
			++count
		}
		for (const obj of matchedObjectInstances) {
			matched[getTreeItemId(obj)] = obj
			++count
		}
		for (const obj of matchedContainers) {
			matched[getTreeItemId(obj)] = obj
			++count
		}
	}
	const matchedKeys = Object.keys(matched)

	const currentIdx = lookup ? matchedKeys.indexOf(getTreeItemId(lookup)) : -1

	function nextItem(offset: number) {
		const idx = posmod(currentIdx + offset, matchedKeys.length)
		const key = matchedKeys[idx]
		dispatch(actions.setOutlinerValue(matched[key]))
	}

	// select first result if current item not in search results
	const onMatchesUpdated = useEffectEvent((matchedKeys: string[]) => {
		if (!search) return
		if (!shouldSelectFirstResult.current) return
		if (matchedKeys.length === 0) return
		if (currentIdx === -1) {
			nextItem(1)
		}
		shouldSelectFirstResult.current = false
	})
	useEffect(() => {
		onMatchesUpdated(matchedKeys)
	}, [matchedKeys])

	return [search, setSearch, currentIdx, matchedKeys.length, nextItem] as const
}
