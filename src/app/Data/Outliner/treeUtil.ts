import { getObjectStringId } from '@/util'
import { createContext } from 'react'
import {
	FixedSizeNodePublicState,
	FixedSizeNodeData,
	FixedSizeTree,
	VariableSizeNodePublicState,
	VariableSizeNodeData,
	VariableSizeTree,
	NodeRecord
} from 'react-vtree'
import { Align } from 'react-window'

export type VTree = FixedSizeTree<any> | VariableSizeTree<any>
export type NodePublicState = FixedSizeNodePublicState<FixedSizeNodeData> | VariableSizeNodePublicState<VariableSizeNodeData>

/**
 * Expand all ancestors of an item and scroll to it
 */
export function jumpToTreeItem(tree: VTree, id: string, align?: Align) {
	const record = tree.state.records.get(id)
	if (!record?.isShown) {
		const update = showTreeItemUpdate(tree, id)
		// NOTE: recomputeTree can interfere with `setTreeItemChildren`
		tree.recomputeTree(update)
	}
	setTimeout(() => {
		tree.scrollToItem(id, align)
	})
}

function showTreeItemUpdate(tree: VTree, id: string) {
	let node = tree.state.records.get(id)
	const update: Record<string, boolean> = {}
	if (!node) { return update }
	while (true) {
		node = node?.parent ?? undefined
		if (node) {
			update[node.public.data.id] = true
		} else {
			break
		}
	}
	return update
}

/**
 * Recursively expand/collapse all children of an item
 */
export function setOpenRecursive(tree: VTree, id: string, open: boolean) {
	const node: NodeRecord<NodePublicState> | null | undefined = tree.state.records.get(id)
	if (!node) { return }

	// update outer modes tree nodes before updating children
	// otherwise react-vtree's list ordering can break
	const updatesByDepth: Record<number, Record<string, boolean>> = { 0: { [id]: open } }

	function recurse(child: typeof node, depth: number) {
		while (child) {
			if (child.child) {
				updatesByDepth[depth] ??= {}
				const updates = updatesByDepth[depth]
				updates[child.public.data.id] = open
				recurse(child.child, depth + 1)
			}
			child = child.sibling
		}
	}
	recurse(node.child, 1)

	let i = 0
	while (true) {
		const updates = updatesByDepth[i]
		if (!updates) { break }
		tree.recomputeTree(updates)
		i++
	}
}

export function filterTree(tree: VTree, ids: Set<string>) {
	const records = tree.state.records
	const shown: Record<string, boolean> = {}
	const update: Record<string, boolean> = {}
	for (const node of records as Iterable<NodeRecord<NodePublicState>>) {
		const id = node.public.data.id
		if (ids.has(id)) {
			let parent: NodeRecord<NodePublicState> | null = node
			while (parent) {
				shown[parent.public.data.id] = true
				parent = parent.parent
			}
		} else {
			update[id] = false
		}
	}
	Object.assign(update, shown)
	tree.recomputeTree(update)
}

export const TreeContext = createContext<VTree | null>(null)

export const getTreeItemId = getObjectStringId

export function createRecord<TData extends FixedSizeNodeData>(tree: FixedSizeTree<TData>, data: TData, parent: NodeRecord<FixedSizeNodePublicState<TData>>): NodeRecord<FixedSizeNodePublicState<TData>> {
	const existingRecord = tree.state.records.get(data.id)
	if (existingRecord) {
		//@ts-ignore
		existingRecord.parent = parent
		//@ts-ignore
		existingRecord.public.data = data
		return existingRecord
	}

	const pub: FixedSizeNodePublicState<TData> = {
		data,
		isOpen: data.isOpenByDefault,
		setOpen: (state: any): Promise<void> => {
			return tree.recomputeTree({
				[data.id]: state,
			})
		}
	}

	return {
		child: null,
		isShown: parent ? parent.public.isOpen && parent.isShown : true,
		parent,
		public: pub,
		sibling: null,
		visited: false,
	}
}

/** Add a record to an existing tree without having to completely recompute treeWalker */
export function addItemToTree<TData extends FixedSizeNodeData>(tree: FixedSizeTree<TData>, data: TData, parentId: string) {
	let parent = tree.state.records.get(parentId)
	if (!parent) { return }
	parent = { ...parent }
	const record = createRecord(tree, data, parent)
	parent.child = record

	// previous state isn't used anywhere and this is much faster than `new Map(records)`
	const records = tree.state.records as Map<string, NodeRecord<FixedSizeNodePublicState<TData>>>
	records.set(data.id, record)
	records.set(parent.public.data.id, parent)
	tree.setState({
		order: tree.state.order,
		records,
		updateRequest: {},
	})
}

export function getTreeItemChildren<TData extends FixedSizeNodeData>(tree: FixedSizeTree<TData>, parentId: string): TData[] {
	const parent = tree.state.records.get(parentId)
	const children: TData[] = []
	let node = parent?.child
	while (node) {
		children.push(node.public.data)
		node = node.sibling
	}
	return children
}

/** Update a tree item's children without having to completely recompute treeWalker */
export function batchSetTreeItemChildren<TData extends FixedSizeNodeData>(tree: FixedSizeTree<TData>, updates: Record<string, TData[]>) {
	// previous state isn't used anywhere and this is much faster than `new Map(records)`
	const records = tree.state.records as Map<string, NodeRecord<FixedSizeNodePublicState<TData>>>

	const opened: Record<string, boolean> = {}

	const oldChildren = new Set<string>()
	for (const [parentId, children] of Object.entries(updates)) {
		const parent = tree.state.records.get(parentId)
		if (!parent) { return }

		// record existing children
		let child = parent.child
		while (child) {
			oldChildren.add(child.public.data.id)
			child = child.sibling
		}
		parent.child = null
		if (parent.public.isOpen) {
			opened[parentId] = true
		}

		let last = parent
		let first = true
		for (const childData of children) {
			const record = createRecord(tree, childData, parent)
			oldChildren.delete(childData.id)
			if (first) {
				last.child = record
				first = false
			} else {
				last.sibling = record
			}
			records.set(childData.id, record)
			last = record
		}
		records.set(parentId, parent)
	}
	// remove old children no longer in the tree
	for (const childId of oldChildren) {
		records.delete(childId)
	}

	tree.setState({
		order: tree.state.order,
		records,
		updateRequest: {},
	})
	tree.recomputeTree(opened)
}
