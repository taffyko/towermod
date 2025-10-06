import api from "@/api"
import { createQuery } from "@/api/helpers"
import { assertUnreachable, getObjectStringId, MiniEvent, UniqueObjectLookup, UniqueTowermodObject, useImperativeHandle, useRerender } from "@/util"
import clsx from "clsx"
import { startTransition, use, useEffect, useMemo, useRef, useState } from "react"
import { List, ListImperativeAPI, ListProps, RowComponentProps } from "react-window"
import arrowDownImg from '@/icons/arrowDown.svg'
import arrowRightImg from '@/icons/arrowRight.svg'
import plusImg from '@/icons/plus.svg'
import deleteImg from '@/icons/close.svg'
import IconButton from "@/components/IconButton"
import Style from './NewTree.module.css'
import AutoSizer from "react-virtualized-auto-sizer"
import { Image } from '@/components/Image'
import { skipToken } from "@tanstack/react-query"

function getDeleteItemFn(id: string): null | (() => void) {
	return null
}
function getAddChildFn(id: string): null | (() => void) {
	return null
}

function stringIdToLookup(id: string): UniqueObjectLookup {
	const strIdx = id.indexOf('-')
	const type = id.substring(0, strIdx) as UniqueTowermodObject['_type']
	const rest = id.substring(strIdx + 1)
	switch (type) {
		case 'LayoutLayer':
		case 'ObjectInstance':
		case 'Animation':
		case 'ImageMetadata':
		case 'ObjectType':
		case 'Container':
			return { _type: type, id: +rest }
		case 'Layout':
		case 'Family':
		case 'ObjectTrait':
			return { _type: type, name: rest }
		case 'Behavior': {
			const [objectTypeId, movIndex] = rest.split('-')
			return { _type: type, objectTypeId: +objectTypeId, movIndex: +movIndex }
		} case 'AppBlock':
			return { _type: type }
		default:
			assertUnreachable(type)
	}
}

const getItem = createQuery({
	queryFn: async (id: string, { hash }): Promise<Item | null> => {
		const ctx = { parent: hash }
		switch (id) {
			case 'Layouts': {
				const layouts = await api.getLayouts(undefined, ctx)
				const children = layouts.map(o => getObjectStringId(o))
				return { id, parentId: null, children, data: null, }
			}
			case 'Behaviors': {
				const behaviors = await api.getBehaviors(undefined, ctx)
				const children = behaviors.map(o => getObjectStringId(o))
				return { id, parentId: null, children, data: null, }
			}
			case 'Containers': {
				const containers = await api.getContainers(undefined, ctx)
				const children = containers.map(o => getObjectStringId(o))
				return { id, parentId: null, children, data: null, }
			}
			case 'Families': {
				const families = await api.getFamilies(undefined, ctx)
				const children = families.map(o => getObjectStringId(o))
				return { id, parentId: null, children, data: null, }
			}
			case 'Object Types': {
				const objectTypes = await api.getObjectTypes(undefined, ctx)
				const children = objectTypes.map(o => getObjectStringId(o))
				return { id, parentId: null, children, data: null, }
			}
			case 'Traits': {
				const traits = await api.getObjectTraits(undefined, ctx)
				const children = traits.map(o => getObjectStringId(o))
				return { id, parentId: null, children, data: null, }
			}
			case 'Project Settings': {
				const data = api.getAppBlock()
				return { id, parentId: null, data, children: [] }
			}
		}

		const lookup = stringIdToLookup(id)
		const data = await api.getTowermodObject(lookup, ctx)
		if (!data) { return null }
		switch (data._type) {
			case 'Layout': {
				const children = (await api.getLayoutLayers(data.name, ctx))
					.map(o => getObjectStringId(o))
				return { id, parentId: 'Layouts', children, data }
			}
			case 'LayoutLayer': {
				const children = (await api.getObjectInstances(data.id, ctx))
					.map(o => getObjectStringId(o))
				const parentId = getObjectStringId({ _type: 'Layout', name: data.layoutName })
				return { id, parentId, children, data }
			}
			case 'ObjectInstance': {
				const children = (await api.getObjectInstances(data.id, ctx))
					.map(o => getObjectStringId(o))
				const parentId = getObjectStringId({ _type: 'LayoutLayer', id: data.layoutLayerId })
				return { id, parentId, children, data }
			}
			case 'Animation': {
				const children = data.subAnimations.map(o => getObjectStringId(o))
				if (data.parentObjectTypeId) {
					const parentId = getObjectStringId({ _type: 'ObjectType', id: data.parentObjectTypeId })
					return { id, parentId, children, data }
				} else if (data.parentAnimationId) {
					const parentId = getObjectStringId({ _type: 'Animation', id: data.parentAnimationId })
					return { id, parentId, children, data }
				} else {
					return null
				}
			}
			case 'Behavior':
				return { id, parentId: 'Behaviors', children: [], data }
			case 'Container':
				return { id, parentId: 'Containers', children: [], data }
			case 'Family':
				return { id, parentId: 'Families', children: [], data }
			case 'ObjectType':
				return { id, parentId: 'Object Types', children: [], data }
			case 'ObjectTrait':
				return { id, parentId: 'Traits', children: [], data }
		}
		return null
	}
})

interface Item {
	id: string
	parentId: string | null
	children: string[]
	data: any
}

export function NewTree() {
	return <div className="flex flex-col grow">
		<AutoSizer disableWidth>
			{({ height }) => 
				<div style={{ height }}>
					<TreeComponent ids={[
						"Layouts",
						"Behaviors",
						"Containers",
						"Families",
						"Object Types",
						"Traits",
						"Project Settings",
					]} />
				</div>
			}
		</AutoSizer>
	</div>
}

function TreeRow(props: RowComponentProps<{
	id: string,
	isOpen: boolean,
	depth: number,
	handle: Tree
}>) {
	const { style, id, isOpen, depth, handle } = props
	const { data: latestItem } = getItem.useQuery(id)
	handle.updateItem(latestItem)
	const item = latestItem ?? handle.items[id]
	const isLeaf = !item?.children?.length

	const selectable = !!item?.data
	const selected = false
	const addChild = getAddChildFn(id)
	const deleteItem = getDeleteItemFn(id)
	
	const { data: iconUrl, isLoading: iconIsLoading } = api.getTowermodObjectIconUrl.useQuery(item?.data?._type ? item?.data : skipToken)
	const { data: displayName, isLoading: nameIsLoading } = api.getTowermodObjectDisplayName.useQuery(item?.data?._type ? item?.data : skipToken)
	
	const isLoading = iconIsLoading || nameIsLoading

	return <div
		style={{ paddingLeft: depth * 30, ...style }}
	>
		<div
			className={clsx(
				'group',
				isLoading && 'opacity-0',
				Style.treeItem,
				selectable && Style.selectable,
				isLeaf && Style.leaf,
				selected && Style.active
			)}
		>
			<IconButton
				className={isLeaf ? 'hidden' : ''}
				src={isOpen ? arrowDownImg : arrowRightImg}
				onMouseDown={(e) => {
					if (e.shiftKey) {
						handle.setOpenRecursive(id, !isOpen)
					} else {
						handle.setOpen(id, !isOpen)
					}
				}}
				onClick={e => e.stopPropagation()}
			/>
			<Image src={iconUrl ?? undefined} />
			<span className="text">{displayName ?? id}</span>
			<IconButton
				onClick={e => {
					e.stopPropagation()
					addChild?.()
				}}
				src={plusImg}
				className={clsx(
					!addChild && 'hidden',
					!selected && 'opacity-0',
					'group-hover:opacity-100 transition-opacity ease-[cubic-bezier(0,0.1,0,1)]',
				)}
			/>
			<IconButton
				onClick={e => {
					e.stopPropagation()
					deleteItem?.()
				}}
				src={deleteImg}
				className={clsx(
					!deleteItem && 'hidden',
					!selected && 'opacity-0',
					'group-hover:opacity-100 transition-opacity ease-[cubic-bezier(0,0.1,0,1)]',
				)}
			/>
		</div>
	</div>
}
/**
 * props memoization to avoid re-rendering `TreeRow` every time `tree` updates
 * only when `id` updates
 */
function TreeRowOuter(props: RowComponentProps<{
	items: { id: string, depth: number}[],
	tree: BaseTree,
	handle: Tree,
}>) {
	const { items, tree, ...rest } = props
	const { id, depth } = items[props.index]
	const isOpen = !!tree.state[id]
	return <TreeRow id={id} isOpen={isOpen} depth={depth} {...rest} />
}


interface BaseTree {
	items: Record<string, Item>,
	state: Record<string, boolean>,
}
interface Tree extends BaseTree {
	setOpen(id: string, open: boolean): void
	setOpenRecursive(id: string, open: boolean): void
	updateItem(item: Item | null | undefined): void
	jumpToItem(id: string): void
}


// const baseTree: BaseTree = {
// 	items: {},
// 	state: {},
// }
// const treeStore = new MiniEvent(baseTree)
// const update = () => treeStore.fire({ ...})

function TreeComponent(props: {
	ref?: React.Ref<Tree>,
	/** Root item IDs */
	ids: string[]
}) {
	const [tree, setTree] = useState<BaseTree>({ items: {}, state: {} })
	const listRef = useRef<ListImperativeAPI>(null!)

	// recursively count visible items
	const visibleItems = useMemo(() => {
		const { items, state } = tree
		const visibleItems: { id: string, depth: number }[] = []
		function recurse(ids: string[], depth: number) {
			for (const id of ids) {
				visibleItems.push({ id, depth })
				if (state[id] === true && items[id]?.children?.length) {
					recurse(items[id].children, depth + 1)
				}
			}
		}
		recurse(props.ids, 0)
		return visibleItems
	}, [tree])

	const scrollToItemIntent = useRef<null | string>(null)
	
	const treeHandle = useImperativeHandle(props.ref, () => ({
		items: tree.items,
		state: tree.state,
		setOpen(id: string, open: boolean) {
			const { items, state } = treeHandle
			state[id] = open
			queueMicrotask(() => setTree({ items, state }))
		},
		setOpenRecursive(id: string, open: boolean) {
			const { items, state } = treeHandle
			function recurse(id: string) {
				state[id] = open
				for (const childId of items[id]?.children || []) {
					recurse(childId)
				}
			}
			recurse(id)
			queueMicrotask(() => setTree({ items, state }))
		},
		updateItem(item: Item | null | undefined) {
			if (!item) return
			const { items, state } = treeHandle
			if (items[item.id] !== item) {
				console.log('updateItem', item)
				// free children that are no longer present
				const prevChildren = new Set(items[item.id]?.children || [])
				for (const childId of prevChildren) {
					if (!prevChildren.has(childId)) {
						delete items[childId]
						delete state[childId]
					}
				}
				// add new item to tree
				items[item.id] = item
				queueMicrotask(() => setTree({ items, state }))
			}
		},
		jumpToItem(id: string) {
			const item = treeHandle.items[id]
			if (!item) return
			scrollToItemIntent.current = id
		}
	}), [visibleItems])
	
	useEffect(() => {
		if (!scrollToItemIntent.current) return
		const index = visibleItems.findIndex(o => o.id === scrollToItemIntent.current)
		if (index === -1) return
		listRef.current.scrollToRow({ index })
		scrollToItemIntent.current = null
	}, [visibleItems])

	return <List
		listRef={listRef}
		rowCount={visibleItems.length}
		rowComponent={TreeRowOuter}
		rowProps={{ items: visibleItems, tree: tree, handle: treeHandle }}
		rowHeight={25}
	/>
}