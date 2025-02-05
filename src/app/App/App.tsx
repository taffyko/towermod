import Style from './App.module.scss';
import Mods from '@/app/Mods';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { Tab, Tabs, TabsHandle } from '@/app/Tabs';
import { useMemo } from 'react';
import { TitleBar } from '@/app/TitleBar';
import { Data, DataHandle } from '@/app/Data';
import Images from '@/app/Images';
import Config from '@/app/Config';
import { useMountEffect, useStateRef } from '@/util/hooks';
import { ModalPageContainer } from '@/app/Modal';
import { AppContext, AppContextState } from './appContext';
import { api } from '@/api';
import { ToastContainer } from '@/app/Toast';
import { Portal } from '@/components/Portal';

const App = () => {
	const [dataHandle, setDataHandle] = useStateRef<DataHandle>()
	const [tabsHandle, setTabsHandle] = useStateRef<TabsHandle>()

	const { data: dataIsLoaded } = api.useIsDataLoadedQuery()
	const [init] = api.useInitMutation();
	const { data: game } = api.useGetGameQuery();

	const appContext = useMemo<AppContextState>(() => {
		return {
			data: dataHandle!,
			tabs: tabsHandle!,
		}
	}, [dataHandle])

	const tabs: Tab[] = useMemo(() => [
		{ name: 'Config', children: <Config /> },
		{ name: 'Mods', children: <Mods /> },
		{ name: 'Images', children: <Images />, disabled: !game },
		{ name: 'Data', children: <Data handleRef={setDataHandle} />, disabled: !dataIsLoaded },
		{ name: 'Events', children: <div />, disabled: !dataIsLoaded },
	], [dataIsLoaded, setDataHandle, game])

	useMountEffect(() => {
		init()
	})

	const [titleRef, setTitleRef] = useStateRef<HTMLDivElement>();

	return <>
		<div ref={setTitleRef} />
		<div className={Style.pageContainer}>
			<AppContext.Provider value={appContext}>
				<ErrorBoundary>
					<ModalPageContainer className={Style.pageContent}>
						<Portal parent={titleRef}>
							<TitleBar />
						</Portal>
						<ToastContainer />
						<Tabs tabs={tabs} handleRef={setTabsHandle} />
					</ModalPageContainer>
				</ErrorBoundary>
			</AppContext.Provider>
		</div>
	</>
};

export default App;
