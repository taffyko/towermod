import { forwardRef } from "react"
import AutoSizer from "react-virtualized-auto-sizer"
import { TreeContext } from "./treeUtil"
import { FixedSizeNodeData, FixedSizeTree, FixedSizeTreeProps } from "react-vtree"
import Scrollbars from "@renderer/components/Scrollbars"
import { useForwardRef } from "@renderer/hooks"

export const TreeComponent = <
	TData extends FixedSizeNodeData
>(
	props: Omit<FixedSizeTreeProps<TData>, 'height' | 'width'> & {
		treeRef?: React.Ref<FixedSizeTree<TData>>
	},
) => {
	const treeRef = useForwardRef(props.treeRef ?? null);

	return <div className="grow">
		<AutoSizer disableWidth>
			{({height}) => (
				<div style={{ height }}>
					<TreeContext.Provider value={treeRef.current}>
						<FixedSizeTree
							async
							outerElementType={CustomScrollbarsVirtualList}
							{...props}
							width="100%"
							ref={treeRef}
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
