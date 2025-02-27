/* eslint-disable max-depth */
import { createContext, useCallback, useContext, useImperativeHandle, useMemo } from 'react';
import {
	FixedSizeNodeData,
	FixedSizeNodePublicState as NodePublicState,
	TreeWalker,
	TreeWalkerValue,
	NodeComponentProps,
	FixedSizeTree,
} from 'react-vtree';
import { useStateRef } from '@/util/hooks';
import { actions, dispatch, store } from '@/redux';
import { assertUnreachable, enumerate } from '@/util/util';
import { jumpToTreeItem, setOpenRecursive, TreeContext } from './treeUtil';
import { TreeComponent } from './Tree';
import Style from './Outliner.module.scss'
import { UniqueObjectLookup, UniqueTowermodObject } from '@/util';
import { QueryScopeFn, useObjectDisplayName, useQueryScope } from '@/appUtil';
import IconButton from '@/components/IconButton';
import arrowDownImg from '@/icons/arrowDown.svg';
import arrowRightImg from '@/icons/arrowRight.svg';
import { api } from '@/api';

function getObjChildren(obj: UniqueObjectLookup, query: QueryScopeFn | null): null | UniqueObjectLookup[] {
	if (!query) { return null }
	switch (obj._type) {
		case 'Layout':
			return query(api.endpoints.getLayoutLayers, obj.name).data ?? []
		case 'LayoutLayer':
			return query(api.endpoints.getObjectInstances, obj.id).data ?? []
		case 'Animation':
			return query(api.endpoints.getAnimationChildren, obj.id).data ?? []
			// return findAnimationById(data, obj.id)?.subAnimations ?? []
			// @ts-ignore
			return obj.subAnimations
	}
	return []
}

type OutlinerNodeData = FixedSizeNodeData &
	{
		name?: string;
		nestingLevel: number;
		obj: UniqueObjectLookup | null;
		children: UniqueObjectLookup[];
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
	tree: FixedSizeTree<OutlinerNodeData>,
	query: QueryScopeFn | null = null,
): TreeWalkerValue<OutlinerNodeData, OutlinerNodeMeta> => {
	const id: string | number = getTreeItemId(obj);

	const state = tree?.state.records.get(id)
	let children: UniqueObjectLookup[] = []
	if (state?.public.isOpen) {
		children = getObjChildren(obj, query) ?? []
	}

	const data: OutlinerNodeData = {
		id: `${obj._type}-${id}`,
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
			id = obj.objectIds[0]
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
	const name = nameOverride ?? objName

	const isLeaf = !children.length;

	return <div
		className={`
			${Style.treeItem}
			${selectable ? Style.selectable : ''}
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
					onClick={(e) => {
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

let renderCount = 0;
let treeRenderCount = 0;
export const Outliner = (props: OutlinerProps) => {
	renderCount += 1;
	console.log("Outliner renders:", renderCount)
	const query = useQueryScope()
	const layouts = api.useGetLayoutsQuery().data || []
	const animations = api.useGetRootAnimationsQuery().data || []
	const behaviors = api.useGetBehaviorsQuery().data || []
	const containers = api.useGetContainersQuery().data || []
	const families = api.useGetFamiliesQuery().data || []
	const objectTypes = api.useGetObjectTypesQuery().data || []
	const traits = api.useGetObjectTraitsQuery().data || []
	const appBlock = api.useGetAppBlockQuery().data

	const [tree, setTreeRef] = useStateRef<FixedSizeTree<OutlinerNodeData>>()

	const handle = useMemo(() => {
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
	useImperativeHandle(props.handleRef, () => handle, [handle])

	const treeWalker = useCallback(function*(): ReturnType<TreeWalker<OutlinerNodeData, OutlinerNodeMeta>> {
		treeRenderCount += 1;
		console.log("Tree renders:", treeRenderCount)
		yield getRootContainerData('Layouts', layouts)
		yield getRootContainerData('Animations', animations)
		yield getRootContainerData('Behaviors', behaviors)
		yield getRootContainerData('Containers', containers)
		yield getRootContainerData('Families', families)
		yield getRootContainerData('Object Types', objectTypes)
		yield getRootContainerData('Traits', traits)
		if (appBlock) { yield getNodeData(appBlock, 0, 0, tree) }

		while (true) {
			const parentMeta = yield;
			for (const [child, i] of enumerate(parentMeta.data.children)) {
				yield getNodeData(child, i, parentMeta.nestingLevel + 1, tree, query)
			}
		}
	}, [layouts, animations, behaviors, containers, families, objectTypes, traits, query])

	return <div className="vbox grow">
		<OutlinerContext.Provider value={handle}>
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

export default Outliner
