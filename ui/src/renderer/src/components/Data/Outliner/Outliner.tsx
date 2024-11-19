/* eslint-disable max-depth */
import { createContext, useCallback, useContext } from 'react';
import {
	FixedSizeNodeData,
	FixedSizeNodePublicState as NodePublicState,
	TreeWalker,
	TreeWalkerValue,
	NodeComponentProps,
} from 'react-vtree';
import { useAppSelector } from '@renderer/hooks';
import { Layout, LayoutLayer, ObjectInstance, Animation, AppBlock, ObjectType, ObjectTrait, Container, Family, Behavior } from '@towermod';
import { assertUnreachable, enumerate } from '@shared/util';
import { setOpenRecursive } from './treeUtil';
import { TreeComponent, TreeContext } from './Tree';
import Style from './Outliner.module.scss'

type TowermodObject = Layout | LayoutLayer | ObjectInstance | Animation | Behavior | Container | Family | ObjectType | ObjectTrait | AppBlock
function getObjChildren(obj: TowermodObject): TowermodObject[] {
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
		obj: TowermodObject | null;
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
	obj: TowermodObject,
	idx: number,
	nestingLevel: number,
): TreeWalkerValue<OutlinerNodeData, OutlinerNodeMeta> => {

	const objType = obj.type;
	let id: string | number = idx;
	let name: string
	switch (objType) {
		case 'Layout':
			name = `Layout: ${obj.name}`
		break; case 'LayoutLayer':
			name = `Layer ${obj.id}: ${obj.name}`
			id = obj.id
		break; case 'ObjectInstance': {
			// TODO: object type name
			const pluginName = '' // TODO
			const objectName = '' // TODO
			name = `Instance: ${pluginName} (${objectName}: ${obj.id})`
			id = obj.id
		} break; case 'Animation':
			// TODO: animations
			name = `Animation ${obj.id}`
			id = obj.id
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
			id = obj.id
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



const defaultTextStyle = {marginLeft: 10};
const defaultButtonStyle = {fontFamily: 'Courier New'};

type OutlinerNodeMeta = Readonly<{
	nestingLevel: number;
}>;

const OutlinerContext = createContext<OutlinerProps>(null!);

type TreeNodeComponentProps = NodeComponentProps<OutlinerNodeData, NodePublicState<OutlinerNodeData>>
const TreeNodeComponent = (props: TreeNodeComponentProps) => {
	const {data: {isLeaf, name, nestingLevel, obj}, isOpen, style, setOpen} = props
	const tree = useContext(TreeContext)
	const { onChange } = useContext(OutlinerContext)

	const selectable = !!obj;

	return <button
		className={`
			${Style.treeItem}
			${selectable ? Style.selectable : ''}
		`}
		onClick={() => {
			if (selectable) {
				console.log("onChange", obj)
				onChange(obj!)
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
	</button>
};

interface OutlinerProps {
	onChange: (value: TowermodObject) => void
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

	const treeWalker = useCallback(function*(): ReturnType<TreeWalker<OutlinerNodeData, OutlinerNodeMeta>> {
		yield getRootContainerData('Animations')
		yield getRootContainerData('Layouts')
		yield getRootContainerData('Behaviors')
		yield getRootContainerData('Containers')
		yield getRootContainerData('Families')
		yield getRootContainerData('Object Types')
		if (appBlock) { yield getNodeData(appBlock, 0, 0) }

		const rootContainerMap: Record<RootContainerName, TowermodObject[]> = {
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
		<OutlinerContext.Provider value={props}>
			<TreeComponent
				treeWalker={treeWalker}
				itemSize={25}
			>
				{TreeNodeComponent}
			</TreeComponent>
		</OutlinerContext.Provider>
	</div>
}

export default Outliner
