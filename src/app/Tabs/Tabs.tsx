import React, { Suspense, useCallback, Activity } from "react"
import Style from './Tabs.module.scss'
import { useEventListener, useIsInert } from "@/util/hooks"
import Text from '@/components/Text'
import { actions, selectTabs, useAppDispatch, useAppSelector } from "@/redux"
import clsx from "clsx"

export const Tabs = (props: {
	tabs: Record<string, React.ReactNode>,
}) => {
	const dispatch = useAppDispatch()
	const tabs = useAppSelector(selectTabs)
	const currentTab = useAppSelector(s => s.app.currentTab)

	const isInert = useIsInert()

	useEventListener(document.body, 'keydown', onKeyDown)

	return <div className={Style.tabs}>
		<div className={Style.tabBarOuter}>
			<div className={Style.tabBar}>
				{tabs.map((tab) =>
					<div
						key={tab}
						onClick={() => dispatch(actions.setCurrentTab(tab))}
						onKeyDown={onKeyDown}
						tabIndex={-1}

						className={`
							${Style.tab}
							${tab === currentTab ? Style.active : ""}
						`}
					>
						<Text>{tab}</Text>
					</div>
				)}
			</div>
		</div>
		{/* BUG: use global loading spinner */}
		<Suspense fallback={<div>loading...</div>}>
			{tabs.map(tab => {
				// render all tabs simultaneously so that tab state
				const children = props.tabs[tab]
				return <Activity mode={tab === currentTab ? 'visible' : 'hidden'} key={tab}>
					<div className={clsx(Style.tabContent, 'stretchbox')}>
						{children}
					</div>
				</Activity>
			})}
		</Suspense>
	</div>

	function onKeyDown(e: KeyboardEvent | React.KeyboardEvent) {
		if (isInert) return

		if (e.code === 'Tab' && e.ctrlKey) {
			if (e.shiftKey) {
				dispatch(actions.nextTab(-1))
			} else {
				dispatch(actions.nextTab(1))
			}
			e.stopPropagation()
		}
	}
}
