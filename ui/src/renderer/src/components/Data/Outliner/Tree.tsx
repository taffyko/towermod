import { createContext, forwardRef, useState } from "react"
import AutoSizer from "react-virtualized-auto-sizer"
import { VTree } from "./treeUtil"
import { FixedSizeNodeData, FixedSizeTree, FixedSizeTreeProps } from "react-vtree"
import Scrollbars from "@renderer/components/Scrollbars"

export const TreeContext = createContext<VTree | null>(null)

export const TreeComponent = <
	TData extends FixedSizeNodeData
>(
	props: Omit<FixedSizeTreeProps<TData>, 'height' | 'width'>,
) => {
	const [tree, setTreeRef] = useState<FixedSizeTree<TData> | null>(null);

	return <div className="grow">
		<AutoSizer disableWidth>
			{({height}) => (
				<div style={{ height }}>
					<TreeContext.Provider value={tree}>
						<FixedSizeTree
							async
							outerElementType={CustomScrollbarsVirtualList}
							{...props}
							width="100%"
							ref={setTreeRef}
							height={height}
						/>
					</TreeContext.Provider>
				</div>
			)}
		</AutoSizer>
	</div>
}

const CustomScrollbarsVirtualList = forwardRef((props: any, ref: any) => {
	const {children, onScroll} = props
	return <Scrollbars
		viewRef={ref}
		onScroll={onScroll}
		children={children}
	/>
});
