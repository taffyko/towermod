import React, { useCallback, useMemo, useState } from "react"
import Style from './Tabs.module.scss'
import { useEventListener } from "@renderer/hooks";
import { posmod } from "@shared/util";

export interface Tab {
  name: string;
  children: React.ReactNode;
}

export const Tabs = (props: { tabs: Tab[] }) => {
  const { tabs } = props;
  const [currentTab, setCurrentTab] = useState(tabs[0]);

  const onKeyDown = useCallback((e: KeyboardEvent | React.KeyboardEvent) => {
    if (e.code === 'Tab' && e.ctrlKey) {
      let tabIdx = tabs.indexOf(currentTab);
      if (e.shiftKey) {
        tabIdx -= 1;
      } else {
        tabIdx += 1;
      }
      tabIdx = posmod(tabIdx, tabs.length);
      console.log('new', tabIdx, tabs[tabIdx])
      setCurrentTab(tabs[tabIdx])
      e.stopPropagation()
    }
  }, [tabs, currentTab])

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
                  ${tab === currentTab ? Style.active : ""}`
                }
              >
                {tab.name}
              </div>
            </div>
        )}
      </div>
    </div>
    <div className={Style.tabContent}>
      {currentTab.children}
    </div>
  </div>
}
