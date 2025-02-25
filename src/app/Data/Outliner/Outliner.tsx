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
import { useMemoAsync, useStateRef } from '@/util/hooks';
import { actions, dispatch, useAppSelector } from '@/redux';
import { assertUnreachable, enumerate } from '@/util/util';
import { jumpToTreeItem, setOpenRecursive, TreeContext } from './treeUtil';
import { TreeComponent } from './Tree';
import Style from './Outliner.module.scss'
import { UniqueObjectLookup, UniqueTowermodObject } from '@/redux';
import { getObjectDisplayName } from '@/util/dataUtil';
import { store } from '@/redux';
import IconButton from '@/components/IconButton';
import arrowDownImg from '@/icons/arrowDown.svg';
import arrowRightImg from '@/icons/arrowRight.svg';

function getObjChildren(obj: UniqueTowermodObject): UniqueTowermodObject[] {
	switch (obj._type) {
		case 'Layout':
			return obj.layers
		case 'LayoutLayer':
			return obj.objects
		case 'Animation':
			return obj.subAnimations
	}
	return []
}

type OutlinerNodeData = FixedSizeNodeData &
	{
		isLeaf: boolean;
		name?: string;
		nestingLevel: number;
		obj: UniqueTowermodObject | null;
	};

type RootContainerName = 'Layouts' | 'Animations' | 'Behaviors' | 'Containers' | 'Families' | 'Object Types' | 'Traits'

const getRootContainerData = (name: RootContainerName) => {
	return {
		data: {
			id: `root-${name}`,
			isLeaf: false,
			isOpenByDefault: false,
			name,
			nestingLevel: 0,
			obj: null,
		},
		nestingLevel: 0
	}
}

const getNodeData = (
	obj: UniqueTowermodObject,
	_idx: number,
	nestingLevel: number,
): TreeWalkerValue<OutlinerNodeData, OutlinerNodeMeta> => {

	const id: string | number = getTreeItemId(obj);

	return {
		data: {
			id: `${obj._type}-${id}`,
			isLeaf: !getObjChildren(obj).length,
			isOpenByDefault: false,
			nestingLevel,
			obj,
		},
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
	const {data: {isLeaf, name: nameOverride, nestingLevel, obj}, isOpen, style, setOpen} = props
	const tree = useContext(TreeContext)
	const selectable = !!obj;

	const objName = useAppSelector(s => obj && getObjectDisplayName(s.data, obj))
	const name = nameOverride ?? objName

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

export const Outliner = (props: OutlinerProps) => {
	const layouts = useAppSelector(s => s.data.layouts) || []
	const animations = useAppSelector(s => s.data.animations) || []
	const behaviors = useAppSelector(s => s.data.behaviors) || []
	const containers = useAppSelector(s => s.data.containers) || []
	const families = useAppSelector(s => s.data.families) || []
	const objectTypes = useAppSelector(s => s.data.objectTypes) || {}
	const traits = useAppSelector(s => s.data.traits) || []
	const appBlock = useAppSelector(s => s.data.appBlock)

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
		yield getRootContainerData('Layouts')
		yield getRootContainerData('Animations')
		yield getRootContainerData('Behaviors')
		yield getRootContainerData('Containers')
		yield getRootContainerData('Families')
		yield getRootContainerData('Object Types')
		if (appBlock) { yield getNodeData(appBlock, 0, 0) }

		const rootContainerMap: Record<RootContainerName, UniqueTowermodObject[]> = {
			'Layouts': layouts,
			'Animations': animations,
			'Behaviors': behaviors,
			'Containers': containers,
			'Families': families,
			'Object Types': Object.values(objectTypes),
			'Traits': traits,
		}

		function* getNodeChildren(parentMeta: TreeWalkerValue<OutlinerNodeData, OutlinerNodeMeta>): ReturnType<TreeWalker<OutlinerNodeData, OutlinerNodeMeta>> {
			if (parentMeta.data.obj){
				const children = getObjChildren(parentMeta.data.obj)
				if (children.length) {
					for (const [child, i] of enumerate(children)) {
						yield getNodeData(child, i, parentMeta.nestingLevel + 1)
					}
				}
 			} else {
				// root containers
				const objects = rootContainerMap[parentMeta.data.name as RootContainerName]
				for (const [obj, i] of enumerate(objects)) { yield getNodeData(obj, i, parentMeta.data.nestingLevel + 1) }
			}
		}

		while (true) {
			const parentMeta = yield;
			yield* getNodeChildren(parentMeta);
		}
	}, [layouts, animations, behaviors, containers, families, objectTypes, traits])

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
