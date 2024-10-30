import { useAppSelector } from "@renderer/hooks"
import React, { CSSProperties } from "react"
// import { FixedSizeTree } from '../../../../../node_modules/react-vtree/dist/index.js'
import { FixedSizeTree } from 'react-vtree'

export const Outliner = () => {
	const layouts = useAppSelector(s => s.data.layouts)

	return <FixedSizeTree treeWalker={treeWalker1 as any} itemSize={30} height={300} width={300}>
		{TreeNodeComponent}
	</FixedSizeTree>
}

const tree = {
	name: 'Root #1',
	id: 'root-1',
	children: [
		{
			children: [
				{id: 'child-2', name: 'Child #2'},
				{id: 'child-3', name: 'Child #3'},
			],
			id: 'child-1',
			name: 'Child #1',
		},
		{
			children: [{id: 'child-5', name: 'Child #5'}],
			id: 'child-4',
			name: 'Child #4',
		},
	],
};

interface CustomTreeNodeData {
	isLeaf: boolean;
	children?: TreeNodeData[];
	name: string;
}
interface TreeNodeData extends CustomTreeNodeData {
	id: string;
	isOpenByDefault: boolean;
}

interface TreeWalkerValue {
	readonly data: TreeNodeData,
}

// function* treeWalker(): Generator<TreeWalkerValue> {
// 	yield { data: { id: '1', name: 'one', isOpenByDefault: true } }
// 	yield { data: { id: '2', name: 'two', isOpenByDefault: true, children: [
// 	yield { data: { id: '3', name: 'three', isOpenByDefault: true } }
// }

function* treeWalker1(r: any): Generator<TreeWalkerValue> {
	const stack: any = [];

	// Remember all the necessary data of the first node in the stack.
	stack.push({
		nestingLevel: 0,
		node: tree,
	});
	console.log("INPUT:", r)

	// Walk through the tree until we have no nodes available.
	while (stack.length !== 0) {
		const {
			node: {children = [], id, name},
			nestingLevel,
		} = stack.pop()!;

		// Here we are sending the information about the node to the Tree component
		// and receive an information about the openness state from it. The
		// `refresh` parameter tells us if the full update of the tree is requested;
		// basing on it we decide to return the full node data or only the node
		// id to update the nodes order.
		const returnNode = {
			data: {
				id,
				isLeaf: children.length === 0,
				isOpenByDefault: false,
				name,
				// nestingLevel,
			}
		}
		const nextParam = yield returnNode
		console.log(nextParam === returnNode, id)
		const isOpened = nextParam;

		// Basing on the node openness state we are deciding if we need to render
		// the child nodes (if they exist).
		if (children.length !== 0 && isOpened) {
			// Since it is a stack structure, we need to put nodes we want to render
			// first to the end of the stack.
			for (let i = children.length - 1; i >= 0; i--) {
				stack.push({
					nestingLevel: nestingLevel + 1,
					node: children[i],
				});
			}
		}
	}
}

interface NodeComponentProps {
	readonly treeData?: any;
	readonly style: CSSProperties,
	readonly isScrolling?: boolean | undefined;
	readonly data: TreeNodeData;
	readonly setOpen: (state: boolean) => Promise<void>;
	readonly isOpen: boolean;
}

const TreeNodeComponent = (props: NodeComponentProps): React.ReactNode => {
	const { treeData, style, isScrolling, data, setOpen, isOpen } = props
	return <div style={style}>
		{!data.isLeaf && (
			<button type="button" onClick={() => setOpen(!isOpen)}>
				{isOpen ? '-' : '+'}
			</button>
		)}
		<div>{data.name}</div>
	</div>
};
