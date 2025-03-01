import { createContext } from 'react';
import {
	FixedSizeNodePublicState,
	FixedSizeNodeData,
	FixedSizeTree,
	VariableSizeNodePublicState,
	VariableSizeNodeData,
	VariableSizeTree,
	NodeRecord
} from 'react-vtree';
import { Align } from 'react-window';

export type VTree = FixedSizeTree<any> | VariableSizeTree<any>
export type NodePublicState = FixedSizeNodePublicState<FixedSizeNodeData> | VariableSizeNodePublicState<VariableSizeNodeData>

/**
 * Expand all ancestors of an item and scroll to it
 */
export function jumpToTreeItem(tree: VTree, id: string, align?: Align) {
	const update = showTreeItemUpdate(tree, id)
	tree.recomputeTree(update)
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
	let node: NodeRecord<NodePublicState> | null | undefined = tree.state.records.get(id)
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

	let i = 0;
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
		const id = node.public.data.id;
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
