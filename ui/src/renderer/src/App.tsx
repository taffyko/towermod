import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Mods from './components/Mods';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Tab, Tabs, TabsHandle } from './components/Tabs';
import { useEffect, useMemo } from 'react';
import { TitleBar } from './components/TitleBar';
import { rpc } from './util';
import { Data, DataHandle } from './components/Data';
import Config from './components/Config';
import Style from './App.module.scss';
import { useAppSelector, useStateRef } from './hooks';
import { ModalParent, ModalContext, ModalContextProvider } from './components/Modal';
import { AppContext, AppContextState } from './appContext';

async function initialize() {
	await rpc.initialize()
	// FIXME
	await rpc.setGamePath("C:\\Program Files (x86)\\Steam\\steamapps\\common\\TowerClimb\\TowerClimb_V1_Steam4.exe")
	await rpc.loadModList()
}

const App = () => {
	const [dataHandle, setDataHandle] = useStateRef<DataHandle>()
	const [tabsHandle, setTabsHandle] = useStateRef<TabsHandle>()

	const dataIsLoaded = useAppSelector(store => !!store.data.objectTypes.length);

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

	return <>
		<AppContext.Provider value={appContext}>
			<ErrorBoundary>
				<ModalContextProvider>
					<TitleBar />
					<ModalContext.Consumer>
						{(modalContext) =>
							<div className={Style.pageContainer}>
								<ModalParent />
								<ToastContainer
									position="top-center"
									theme="dark"
								/>
								<div
									className={Style.pageContent}
									// @ts-ignore
									inert={modalContext?.modalOpen ? "" : undefined}
								>
									<ErrorBoundary>
										<Tabs tabs={tabs} handleRef={setTabsHandle} />
									</ErrorBoundary>
								</div>
							</div>
						}
					</ModalContext.Consumer>
				</ModalContextProvider>
			</ErrorBoundary>
		</AppContext.Provider>
	</>
};

export default App;
