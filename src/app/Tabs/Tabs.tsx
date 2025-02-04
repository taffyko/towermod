import React, { useCallback, useContext, useMemo, useState } from "react"
import Style from './Tabs.module.scss'
import { useEventListener, useImperativeHandle } from "@/hooks";
import { posmod } from "@/util";
import { ModalContext } from "../Modal";
import Text from '@/components/Text'

export interface Tab {
	name: string;
	children: React.ReactNode;
	disabled?: boolean;
}

export interface TabsHandle {
	currentTab: string,
	setCurrentTab(name: string): void,
	nextTab(offset: number): void,
}

export const Tabs = (props: {
	tabs: Tab[],
	handleRef?: React.Ref<TabsHandle>,
}) => {
	const { tabs: allTabs } = props;
	const tabs = useMemo(() => allTabs.filter(tab => !tab.disabled), [allTabs])
	const [currentTab, setCurrentTab] = useState(tabs[0]);

	const handle = useImperativeHandle(props.handleRef, () => ({
		currentTab: currentTab.name,
		setCurrentTab(name) {
			for (const tab of tabs) {
				if (tab.name === name) {
					setCurrentTab(tab)
				}
			}
		},
		nextTab(offset) {
			let tabIdx = tabs.indexOf(currentTab) + offset;
			tabIdx = posmod(tabIdx, tabs.length);
			setCurrentTab(tabs[tabIdx])
		},
	}), [tabs, setCurrentTab, currentTab])

	const modalContext = useContext(ModalContext)

	const onKeyDown = useCallback((e: KeyboardEvent | React.KeyboardEvent) => {
		if (modalContext?.isModalOpen) {
			return
		}

		if (e.code === 'Tab' && e.ctrlKey) {
			if (e.shiftKey) {
				handle.nextTab(-1)
			} else {
				handle.nextTab(1)
			}
			e.stopPropagation()
		}
	}, [tabs, currentTab, modalContext])

	useEventListener(window, 'keydown', onKeyDown)

	return <div className={Style.tabs}>
		<div className={Style.tabBarOuter}>
			<div className={Style.tabBar}>
				{tabs.map((tab) =>
						<div
							key={tab.name}
							className={`
								${Style.tabOuter}
								${tab === currentTab ? Style.active : ""}
							`}

							onClick={() => setCurrentTab(tab)}
							onKeyDown={onKeyDown}
							tabIndex={0}
						>
							<div
								className={`
									${Style.tab}
									${tab === currentTab ? Style.active : ""}
								`}
							>
								<Text>{tab.name}</Text>
							</div>
						</div>
				)}
			</div>
		</div>
		<div className={`${Style.tabContent} stretchbox`}>
			{currentTab.children}
		</div>

		{/* {tabs.map(tab => {
			// render all tabs simultaneously so that tab state
			return <div
				key={tab.name}
				style={{ display: tab === currentTab ? '' : 'none' }}
				className={`${Style.tabContent} stretchbox`}
			>
				{tab.children}
			</div>
		})} */}
	</div>
}
