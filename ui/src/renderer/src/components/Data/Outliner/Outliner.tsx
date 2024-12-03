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
import { useAppSelector, useStateRef } from '@renderer/hooks';
import { assertUnreachable, enumerate } from '@shared/util';
import { jumpToTreeItem, setOpenRecursive, TreeContext } from './treeUtil';
import { TreeComponent } from './Tree';
import Style from './Outliner.module.scss'
import { UniqueTowermodObject } from '@shared/reducers/data';
import { AppContext } from '@renderer/appContext';

function getObjChildren(obj: UniqueTowermodObject): UniqueTowermodObject[] {
	switch (obj.type) {
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
		name: string;
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

	const objType = obj.type;
	const id: string | number = getTreeItemId(obj);
	let name: string
	switch (objType) {
		case 'Layout':
			name = `Layout: ${obj.name}`
		break; case 'LayoutLayer':
			name = `Layer ${obj.id}: ${obj.name}`
		break; case 'ObjectInstance': {
			// TODO: object type name
			const pluginName = '' // TODO
			const objectName = '' // TODO
			name = `Instance: ${pluginName} (${objectName}: ${obj.id})`
		} break; case 'Animation':
			// TODO: animations
			name = `Animation ${obj.id}`
		break; case 'Behavior':
			name = `Behavior: ${obj.name}`
		break; case 'Container':
			const firstObjName = '' // TODO
			name = `Container: ${firstObjName}`
		break; case 'Family':
			name = `Family: ${obj.name}`
		break; case 'ObjectType': {
			const pluginName = '' // TODO
			name = `Type ${obj.id}: (${pluginName}: ${obj.name})`
		} break; case 'ObjectTrait':
			name = `Trait: ${obj.name}`
		break; case 'AppBlock':
			name = 'Project Settings'
		break; default:
			assertUnreachable(objType)
	}

	return {
		data: {
			id: `${obj.type}-${id}`,
			isLeaf: !getObjChildren(obj).length,
			isOpenByDefault: false,
			name,
			nestingLevel,
			obj,
		},
		nestingLevel,
	}
};

const getTreeItemId = (obj: UniqueTowermodObject) => {
	const objType = obj.type;
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
			id = `${obj.objectTypeId}-${obj.name}`
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
			assertUnreachable(objType)
	}
	return `${obj.type}-${id}`
}

const defaultTextStyle = {marginLeft: 10};
const defaultButtonStyle = {fontFamily: 'Courier New'};

type OutlinerNodeMeta = Readonly<{
	nestingLevel: number;
}>;

type TreeNodeComponentProps = NodeComponentProps<OutlinerNodeData, NodePublicState<OutlinerNodeData>>
const TreeNodeComponent = (props: TreeNodeComponentProps) => {
	const {data: {isLeaf, name, nestingLevel, obj}, isOpen, style, setOpen} = props
	const tree = useContext(TreeContext)
	const app = useContext(AppContext)

	const selectable = !!obj;

	return <div
		className={`
			${Style.treeItem}
			${selectable ? Style.selectable : ''}
		`}
		onClick={() => {
			if (selectable) {
				app?.data?.setValue(obj!)
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
				<button
					type="button"
					onClick={(e) => {
						if (e.shiftKey && tree) {
							setOpenRecursive(tree, props.data.id, !isOpen)
						} else {
							setOpen(!isOpen)
						}
					}}
					style={defaultButtonStyle}
				>
					{isOpen ? 'V' : '>'}
				</button>
			</div>
		)}
		<div style={defaultTextStyle}>{name}</div>
	</div>
};

export interface OutlinerHandle {
	tree: FixedSizeTree<OutlinerNodeData>
	jumpToItem(obj: UniqueTowermodObject)
	setOpen(obj: UniqueTowermodObject, open: boolean)
	setOpenRecursive(obj: UniqueTowermodObject, open: boolean)
}

const OutlinerContext = createContext<OutlinerHandle>(null!);

export interface OutlinerProps {
	setValue: (value: UniqueTowermodObject) => void,
	handleRef?: React.Ref<OutlinerHandle>,
}

export const Outliner = (props: OutlinerProps) => {
	const layouts = useAppSelector(s => s.data.layouts) || []
	const animations = useAppSelector(s => s.data.animations) || []
	const behaviors = useAppSelector(s => s.data.behaviors) || []
	const containers = useAppSelector(s => s.data.containers) || []
	const families = useAppSelector(s => s.data.families) || []
	const objectTypes = useAppSelector(s => s.data.objectTypes) || []
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
				setOpenRecursive(obj, treeItemId, open)
			},
		}
	}, [tree])
	useImperativeHandle(props.handleRef, () => handle, [handle])

	const treeWalker = useCallback(function*(): ReturnType<TreeWalker<OutlinerNodeData, OutlinerNodeMeta>> {
		yield getRootContainerData('Animations')
		yield getRootContainerData('Layouts')
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
			'Object Types': objectTypes,
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
