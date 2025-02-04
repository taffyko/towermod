import Mods from './components/Mods';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Tab, Tabs, TabsHandle } from './components/Tabs';
import { useEffect, useMemo, useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { Data, DataHandle } from './components/Data';
import Config from './components/Config';
import Style from './App.module.scss';
import { useStateRef } from './hooks';
import { ModalContext, ModalContextContainer, ModalContextProvider } from './components/Modal';
import { AppContext, AppContextState } from './appContext';
import { initialize } from './thunks';
import { api } from './api';
import { ToastContainer } from '@/components/Toast';
import { Portal } from './components/Portal';

const App = () => {
	const [dataHandle, setDataHandle] = useStateRef<DataHandle>()
	const [tabsHandle, setTabsHandle] = useStateRef<TabsHandle>()

	const { data: project } = api.useIsDataLoadedQuery()
	const dataIsLoaded = !!project

	const appContext = useMemo<AppContextState>(() => {
		return {
			data: dataHandle!,
			tabs: tabsHandle!,
		}
	}, [dataHandle])

	const tabs: Tab[] = useMemo(() => [
		{ name: 'Config', children: <Config /> },
		{ name: 'Mods', children: <Mods /> },
		{ name: 'Images', children: <div /> },
		{ name: 'Data', children: <Data handleRef={setDataHandle} />, disabled: !dataIsLoaded },
		{ name: 'Events', children: <div />, disabled: !dataIsLoaded },
	], [dataIsLoaded, setDataHandle])

	useEffect(() => {
		initialize()
	}, [])

	const [titleRef, setTitleRef] = useStateRef<HTMLDivElement>();

	return <>
		<div ref={setTitleRef} />
		<div className={Style.pageContainer}>
			<AppContext.Provider value={appContext}>
				<ErrorBoundary>
					<ModalContextContainer className={Style.pageContent}>
						<ErrorBoundary>
							<Portal parent={titleRef}>
								<TitleBar />
							</Portal>
							<ToastContainer />
							<Tabs tabs={tabs} handleRef={setTabsHandle} />
						</ErrorBoundary>
					</ModalContextContainer>
				</ErrorBoundary>
			</AppContext.Provider>
		</div>
	</>
};

export default App;
