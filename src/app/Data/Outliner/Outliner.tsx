
import { api } from '@/api'
import { spin } from '@/app/GlobalSpinner'
import { fetchRtk, QueryScopeFn, useObjectDisplayName, useObjectIcon, useQueryScope } from '@/appUtil'
import { DropdownMenu, ToggleMenuItem } from '@/components/DropdownMenu'
import IconButton from '@/components/IconButton'
import { Image } from '@/components/Image/Image'
import { LineEdit } from '@/components/LineEdit'
import arrowDownImg from '@/icons/arrowDown.svg'
import arrowRightImg from '@/icons/arrowRight.svg'
import plusImg from '@/icons/plus.svg'
import { actions, dispatch, useAppSelector } from '@/redux'
import { Animation } from '@/towermod'
import { getObjectDisplayName, LookupForType, towermodObjectIdsEqual, UniqueObjectLookup, UniqueTowermodObject } from '@/util'
import { useImperativeHandle, useRerender, useStateRef } from '@/util/hooks'
import { enumerate, posmod } from '@/util/util'
import { createSelector } from '@reduxjs/toolkit'
import { skipToken } from '@reduxjs/toolkit/query'
import clsx from 'clsx'
import { debounce } from 'lodash-es'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
	FixedSizeNodeData,
	FixedSizeTree,
	NodeComponentProps,
	FixedSizeNodePublicState as NodePublicState,
	TreeWalker,
	TreeWalkerValue
} from 'react-vtree'
import Style from './Outliner.module.scss'
import { TreeComponent } from './Tree'
import { batchSetTreeItemChildren, getTreeItemId, jumpToTreeItem, setOpenRecursive } from './treeUtil'



type OutlinerTowermodObject = Exclude<UniqueObjectLookup, LookupForType<'Animation'>>
	| Animation

function getObjChildren(obj: OutlinerTowermodObject, query: QueryScopeFn | null): undefined | OutlinerTowermodObject[] {
	switch (obj._type) {
		case 'Layout': {
			const queryName = `getObjChildren.${getTreeItemId(obj)}`
			return query?.(api.endpoints.getLayoutLayers, obj.name, queryName).data ?? []
		} case 'LayoutLayer': {
			const queryName = `getObjChildren.${getTreeItemId(obj)}`
			return query?.(api.endpoints.getObjectInstances, obj.id, queryName).data ?? []
		}
	}
}

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
	query: QueryScopeFn | null = null,
): TreeWalkerValue<OutlinerNodeData, OutlinerNodeMeta> => {
	const id: string | number = getTreeItemId(obj)

	const children = getObjChildren(obj, query)

	const data: OutlinerNodeData = {
		id,
		children,
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



function useOutlinerObjectData(lookup: OutlinerTowermodObject | null, idx: number | null): { obj?: UniqueTowermodObject, hasIcon: null | boolean, iconUrl?: string, displayName?: string, children?: OutlinerTowermodObject[] } {
	const [query] = useQueryScope()
	let obj: UniqueTowermodObject | undefined
	let hasIcon: null | boolean = null
	let iconUrl: string | undefined
	let displayName: string | undefined
	let children: OutlinerTowermodObject[] | undefined

	const bulkQueryImplemented = { forObj: false, forIcon: false }
	if (idx != null) {
		const pageSize = 500
		const page = Math.floor(idx / pageSize)
		let pageData: undefined | any[]
		let iconsPageData: undefined | { url?: string }[]
		switch (lookup?._type) {
			case 'ObjectType': {
				void ({ data: pageData } = query(api.endpoints.getOutlinerObjectTypes, { page, pageSize }, 'getObjects'))
				void ({ data: iconsPageData } = query(api.endpoints.getOutlinerObjectTypeIcons, { page, pageSize }, 'getIcons'))
				bulkQueryImplemented.forObj = true
				bulkQueryImplemented.forIcon = true
			} break; case 'Animation':
				bulkQueryImplemented.forObj = true
				hasIcon = true
				children = lookup.subAnimations
				displayName = getObjectDisplayName(lookup)
		}

		if (pageData) {
			const idxInPage = idx % pageSize
			obj = pageData?.[idxInPage]
			if (bulkQueryImplemented.forIcon) {
				iconUrl = iconsPageData?.[idxInPage].url
			}
			switch (obj?._type) {
				case 'ObjectType': {
					const isSprite = obj.pluginName === 'Sprite'
					hasIcon ||= isSprite
					children = (obj as { animation?: Animation }).animation?.subAnimations
					displayName = getObjectDisplayName(obj)
				}
			}
		}
	}

	// TODO: update queries for other outliner objects to also fetch in pages
	const objectIconInfo = useObjectIcon(bulkQueryImplemented.forIcon ? null : lookup)
	hasIcon ??= objectIconInfo.hasIcon
	iconUrl ??= objectIconInfo.data
	const displayName1 = useObjectDisplayName(bulkQueryImplemented.forObj ? null : lookup)
	displayName ??= displayName1
	hasIcon ||= !!iconUrl

	return { obj, hasIcon, iconUrl, displayName, children }
}

function getAddChildImplementation(obj?: UniqueTowermodObject): (() => Promise<void>) | undefined {
	switch (obj?._type) {
		case 'ObjectType':
			if (obj.pluginName === 'Sprite') {
				return async () => {
					const id = await spin(fetchRtk('createAnimation', { objectTypeId: obj.id }))
					dispatch(actions.setOutlinerValue({ _type: 'Animation', id }))
				}
			}
	}
}

type TreeNodeComponentProps = NodeComponentProps<OutlinerNodeData, NodePublicState<OutlinerNodeData>>
const TreeNodeComponent = (props: TreeNodeComponentProps) => {
	const {data: {name: nameOverride, nestingLevel, obj, idx, id}, isOpen, style, setOpen} = props
	const context = useContext(OutlinerContext)
	const { tree } = context
	const selectable = !!obj

	const { obj: objData, hasIcon, iconUrl, displayName, children } = useOutlinerObjectData(obj, idx)

	const name = nameOverride ?? displayName
	const selected = useAppSelector(s => towermodObjectIdsEqual(s.app.outlinerValue, obj))

	useEffect(() => {
		if (children && children.length) {
			context.setTreeItemChildren(children, id)
		}
	}, [children])

	const nodeRecord = tree.state.records.get(props.data.id)
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
	setTreeItemChildren(items: OutlinerTowermodObject[], parentId: string): void
}

export const OutlinerContext = createContext<OutlinerHandle>(null!)

export interface OutlinerProps {
	handleRef?: React.Ref<OutlinerHandle>,
}


export const Outliner = (props: OutlinerProps) => {
	const [query] = useQueryScope()
	const layouts = api.useGetLayoutsQuery().data || []
	const behaviors = api.useGetBehaviorsQuery().data || []
	const containers = api.useGetContainersQuery().data || []
	const families = api.useGetFamiliesQuery().data || []
	const objectTypes = api.useGetObjectTypesQuery().data || []
	const traits = api.useGetObjectTraitsQuery().data || []
	const appBlock = api.useGetAppBlockQuery().data
	const [tree, setTreeRef] = useStateRef<FixedSizeTree<OutlinerNodeData>>()
	//@ts-ignore
	window.tree = tree
	const lookup = useAppSelector(s => s.app.outlinerValue)
	const rerender = useRerender()

	const queuedTreeItemUpdates = useRef<Record<string, OutlinerNodeData[]>>({})
	const _dispatchTreeItemUpdates = useMemo(() =>
		debounce((tree: FixedSizeTree<OutlinerNodeData>) => {
			batchSetTreeItemChildren(tree, queuedTreeItemUpdates.current)
			queuedTreeItemUpdates.current = {}
			rerender()
		}, 5, { trailing: true })
	, [tree, rerender])

	const handle = useImperativeHandle(props.handleRef, () => {
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
			setTreeItemChildren(items: OutlinerTowermodObject[], parentId: string) {
				if (!tree) { return }
				const parent = tree.state.records.get(parentId)
				if (!parent) { return }
				const children = items.map((item, idx) => (
					getNodeData(item, idx, parent.public.data.nestingLevel + 1, tree).data
				))
				queuedTreeItemUpdates.current[parentId] = children
				_dispatchTreeItemUpdates(tree)
			}
		} as OutlinerHandle
	}, [tree])

	// const hasItem = useMemo(() => {
	// 	return lookup ? handle.hasItem(lookup) : false
	// }, [tree?.state.records.size])
	const hasItem = lookup ? handle.hasItem(lookup) : false

	useEffect(() => {
		// jump to selected item
		if (lookup && hasItem) {
			handle.jumpToItem(lookup)
		}
	}, [handle, lookup, hasItem])

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
				yield getNodeData(child, i, parentMeta.nestingLevel + 1, tree, query)
			}
		}
	}, [layouts, behaviors, containers, families, objectTypes, traits, query])


	return <div className="vbox grow">
		<OutlinerContext.Provider value={handle}>
			<div className="hbox gap">
				<OutlinerSearch />
				<div className="grow" />
				<OutlinerHistoryButtons />
			</div>
			<TreeComponent
				treeWalker={treeWalker}
				itemSize={25}
				treeRef={setTreeRef}
			>
				{TreeNodeComponent}
			</TreeComponent>
		</OutlinerContext.Provider>
	</div>
}

function OutlinerSearch() {
	const handle = useContext(OutlinerContext)
	const [caseSensitive, setCaseSensitive] = useState(false)
	const [searchObjectTypes, setSearchObjectTypes] = useState(true)
	const [searchObjectInstances, setSearchObjectInstances] = useState(false)
	const [searchLayoutLayers, setSearchLayoutLayers] = useState(false)
	const [searchContainers, setSearchContainers] = useState(false)
	const [search, setSearch, matchIdx, matchCount, nextMatch] = useOutlinerSearch(handle, {
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

function useOutlinerSearch(handle: OutlinerHandle, options: {
	caseSensitive: boolean,
	searchObjectTypes: boolean,
	searchObjectInstances: boolean,
	searchLayoutLayers: boolean,
	searchContainers: boolean,
}) {
	const { caseSensitive, searchObjectTypes, searchObjectInstances, searchLayoutLayers, searchContainers } = options
	const lookup = useAppSelector(s => s.app.outlinerValue)
	const [search, setSearch] = useState("")
	const searchOptions = search ? {
		text: caseSensitive ? search : search.toLowerCase(),
		caseSensitive
	} : undefined
	const matchedObjectTypes = api.useSearchObjectTypesQuery((searchObjectTypes && searchOptions) || skipToken).currentData || emptyArray
	const matchedLayoutLayers = api.useSearchLayoutLayersQuery((searchLayoutLayers && searchOptions) || skipToken).currentData || emptyArray
	const matchedObjectInstances = api.useSearchObjectInstancesQuery((searchObjectInstances && searchOptions) || skipToken).currentData || emptyArray
	const matchedContainers = api.useSearchContainersQuery((searchContainers && searchOptions) || skipToken).currentData || emptyArray


	const [matched, matchedKeys] = useMemo(() => {
		if (!search) {
			return [{}, []]
		}
		const map: Record<string, UniqueObjectLookup> = {}
		let count = 0
		for (const obj of matchedObjectTypes) {
			map[getTreeItemId(obj)] = obj
			++count
		}
		for (const obj of matchedLayoutLayers) {
			map[getTreeItemId(obj)] = obj
			++count
		}
		for (const obj of matchedObjectInstances) {
			map[getTreeItemId(obj)] = obj
			++count
		}
		for (const obj of matchedContainers) {
			map[getTreeItemId(obj)] = obj
			++count
		}
		return [map, Object.keys(map)] as const
	}, [search, matchedObjectTypes, matchedLayoutLayers, matchedObjectInstances, matchedContainers])

	const currentIdx = useMemo(() => lookup ? matchedKeys.indexOf(getTreeItemId(lookup)) : -1, [matchedKeys, lookup])

	function nextItem(offset: number) {
		const idx = posmod(currentIdx + offset, matchedKeys.length)
		const key = matchedKeys[idx]
		dispatch(actions.setOutlinerValue(matched[key]))
	}

	useEffect(() => {
		if (handle.tree && search) {
			// select first matched item if current item not in search results
			if (currentIdx === -1) {
				nextItem(1)
			}
		}
	}, [search, matched])

	return [search, setSearch, currentIdx, matchedKeys.length, nextItem] as const
}

export default Outliner
