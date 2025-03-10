/* eslint-disable max-depth */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
	FixedSizeNodeData,
	FixedSizeNodePublicState as NodePublicState,
	TreeWalker,
	TreeWalkerValue,
	NodeComponentProps,
	FixedSizeTree,
} from 'react-vtree';
import { useImperativeHandle, useStateRef } from '@/util/hooks';
import { actions, dispatch, useAppSelector } from '@/redux';
import { assertUnreachable, enumerate, objectShallowEqual, posmod } from '@/util/util';
import { jumpToTreeItem, setOpenRecursive, TreeContext } from './treeUtil';
import { TreeComponent } from './Tree';
import Style from './Outliner.module.scss'
import { UniqueObjectLookup, UniqueTowermodObject, towermodObjectIdsEqual } from '@/util';
import { QueryScopeFn, useObjectDisplayName, useObjectIcon, useQueryScope } from '@/appUtil';
import IconButton from '@/components/IconButton';
import arrowDownImg from '@/icons/arrowDown.svg';
import arrowRightImg from '@/icons/arrowRight.svg';
import { api } from '@/api';
import { LineEdit } from '@/components/LineEdit';
import { skipToken } from '@reduxjs/toolkit/query';
import { Select } from '@/components/Select';
import { createSelector } from '@reduxjs/toolkit';
import { DropdownMenu, ToggleMenuItem } from '@/components/DropdownMenu';
import { Icon } from '@/components/Icon';

function getObjChildren(obj: UniqueObjectLookup, query: QueryScopeFn | null): undefined | UniqueObjectLookup[] {
	switch (obj._type) {
		case 'Layout':
			return query?.(api.endpoints.getLayoutLayers, obj.name).data ?? []
		case 'LayoutLayer':
			return query?.(api.endpoints.getObjectInstances, obj.id).data ?? []
		case 'Animation':
			return query?.(api.endpoints.getAnimationChildren, obj.id).data ?? []
	}
}

type OutlinerNodeData = FixedSizeNodeData &
	{
		name?: string;
		nestingLevel: number;
		obj: UniqueObjectLookup | null;
		children?: UniqueObjectLookup[];
	};

type RootContainerName = 'Layouts' | 'Animations' | 'Behaviors' | 'Containers' | 'Families' | 'Object Types' | 'Traits'

const getRootContainerData = (name: RootContainerName, children: UniqueObjectLookup[]): TreeWalkerValue<OutlinerNodeData, OutlinerNodeMeta> => {
	return {
		data: {
			id: `root-${name}`,
			isOpenByDefault: false,
			name,
			children,
			nestingLevel: 0,
			obj: null,
		},
		nestingLevel: 0
	}
}

const getNodeData = (
	obj: UniqueObjectLookup,
	_idx: number,
	nestingLevel: number,
	_tree: FixedSizeTree<OutlinerNodeData> | null,
	query: QueryScopeFn | null = null,
): TreeWalkerValue<OutlinerNodeData, OutlinerNodeMeta> => {
	const id: string | number = getTreeItemId(obj);

	const children = getObjChildren(obj, query)

	const data: OutlinerNodeData = {
		id,
		children,
		isOpenByDefault: false,
		nestingLevel,
		obj,
	}

	return {
		data,
		nestingLevel,
	}
};

const getTreeItemId = (obj: UniqueObjectLookup) => {
	const objType = obj._type;
	let id: string | number
	switch (objType) {
		case 'Layout':
			id = obj.name
		break; case 'LayoutLayer':
			id = obj.id
		break; case 'ObjectInstance':
			id = obj.id
		break; case 'Animation':
			id = obj.id
		break; case 'Behavior':
			id = `${obj.objectTypeId}-${obj.movIndex}`
		break; case 'Container':
			id = obj.id
		break; case 'Family':
			id = obj.name
		break; case 'ObjectType':
			id = obj.id
		break; case 'ObjectTrait':
			id = obj.name
		break; case 'AppBlock':
			id = ''
		break; default:
			assertUnreachable(objType, obj)
	}
	return `${obj._type}-${id}`
}

const defaultTextStyle = {marginLeft: 10};
const defaultButtonStyle = {fontFamily: 'Courier New'};

type OutlinerNodeMeta = Readonly<{
	nestingLevel: number;
}>;

type TreeNodeComponentProps = NodeComponentProps<OutlinerNodeData, NodePublicState<OutlinerNodeData>>
const TreeNodeComponent = (props: TreeNodeComponentProps) => {
	const {data: {name: nameOverride, nestingLevel, obj, children}, isOpen, style, setOpen} = props
	const tree = useContext(TreeContext)
	const selectable = !!obj;

	const objName = useObjectDisplayName(obj)
	const { data: icon, hasIcon } = useObjectIcon(obj)
	const name = nameOverride ?? objName
	const selected = useAppSelector(s => towermodObjectIdsEqual(s.app.outlinerValue, obj))

	const isLeaf = !children?.length;

	if (!name) {
		return <div className="opacity-0" />
	}


	return <div
		className={`
			${Style.treeItem}
			${selectable ? Style.selectable : ''}
			${selected ? Style.active : ''}
		`}
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
					style={defaultButtonStyle}
				/>
			</div>
		)}
		<Icon noReflow={hasIcon} src={icon} className="h-[25px] w-[25px]" />
		<div style={defaultTextStyle}>{name}</div>
	</div>
};

export interface OutlinerHandle {
	tree: FixedSizeTree<OutlinerNodeData>
	jumpToItem(obj: UniqueObjectLookup): void
	setOpen(obj: UniqueObjectLookup, open: boolean): void
	setOpenRecursive(obj: UniqueObjectLookup, open: boolean): void
}

export const OutlinerContext = createContext<OutlinerHandle>(null!);

export interface OutlinerProps {
	handleRef?: React.Ref<OutlinerHandle>,
}

export const Outliner = (props: OutlinerProps) => {
	const [query] = useQueryScope()
	const layouts = api.useGetLayoutsQuery().data || []
	// const animations = api.useGetRootAnimationsQuery().data || []
	const behaviors = api.useGetBehaviorsQuery().data || []
	const containers = api.useGetContainersQuery().data || []
	const families = api.useGetFamiliesQuery().data || []
	const objectTypes = api.useGetObjectTypesQuery().data || []
	const traits = api.useGetObjectTraitsQuery().data || []
	const appBlock = api.useGetAppBlockQuery().data
	const [tree, setTreeRef] = useStateRef<FixedSizeTree<OutlinerNodeData>>()
	const lookup = useAppSelector(s => s.app.outlinerValue)

	const handle = useImperativeHandle(props.handleRef, () => {
		return {
			tree: tree!,
			jumpToItem(obj) {
				const treeItemId = getTreeItemId(obj)
				if (tree) { jumpToTreeItem(tree, treeItemId) }
			},
			setOpen(obj, open: boolean) {
				const treeItemId = getTreeItemId(obj)
				tree?.recomputeTree({ [treeItemId]: open })
			},
			setOpenRecursive(obj, open: boolean) {
				const treeItemId = getTreeItemId(obj)
				setOpenRecursive(tree!, treeItemId, open)
			},
		} as OutlinerHandle
	}, [tree])

	useEffect(() => {
		// jump to selected item
		if (lookup) { handle.jumpToItem(lookup) }
	}, [handle, lookup])

	const treeWalker = useCallback(function*(): ReturnType<TreeWalker<OutlinerNodeData, OutlinerNodeMeta>> {
		yield getRootContainerData('Layouts', layouts)
		yield getRootContainerData('Behaviors', behaviors)
		yield getRootContainerData('Containers', containers)
		yield getRootContainerData('Families', families)
		yield getRootContainerData('Object Types', objectTypes)
		yield getRootContainerData('Traits', traits)
		if (appBlock) { yield getNodeData(appBlock, 0, 0, tree) }

		while (true) {
			const parentMeta = yield;
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
	const [caseSensitive, setCaseSensitive] = useState(false);
	const [searchObjectTypes, setSearchObjectTypes] = useState(true);
	const [searchObjectInstances, setSearchObjectInstances] = useState(false);
	const [searchLayoutLayers, setSearchLayoutLayers] = useState(false);
	const [searchContainers, setSearchContainers] = useState(false);
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
				matchIdx !== -1
					? <div>{`${matchIdx+1}/${matchCount}`}</div>
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

const emptyArray = [] as const;

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
	let matchedObjectTypes = api.useSearchObjectTypesQuery((searchObjectTypes && searchOptions) || skipToken).currentData || emptyArray
	let matchedLayoutLayers = api.useSearchLayoutLayersQuery((searchLayoutLayers && searchOptions) || skipToken).currentData || emptyArray
	let matchedObjectInstances = api.useSearchObjectInstancesQuery((searchObjectInstances && searchOptions) || skipToken).currentData || emptyArray
	let matchedContainers = api.useSearchContainersQuery((searchContainers && searchOptions) || skipToken).currentData || emptyArray


	const [matched, matchedKeys] = useMemo(() => {
		if (!search) {
			return [{}, []]
		}
		const map: Record<string, UniqueObjectLookup> = {}
		let count = 0;
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
