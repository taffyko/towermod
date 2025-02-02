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

export const TreeContext = createContext<VTree | null>(null)
