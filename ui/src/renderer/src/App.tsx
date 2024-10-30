import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Mods from './components/Mods';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Tab, Tabs } from './components/Tabs';
import { useEffect, useMemo } from 'react';
import { TitleBar } from './components/TitleBar';
import { rpc } from './util';
import { Data } from './components/Data';
import Config from './components/Config';
import Style from './App.module.scss';

function initialize() {
	// FIXME
	rpc.setGamePath("C:\\Program Files (x86)\\Steam\\steamapps\\common\\TowerClimb\\TowerClimb_V1_Steam4.exe")
	rpc.loadModList()
}

const App = () => {
	const tabs: Tab[] = useMemo(() => [
			{ name: 'Config', children: <Config /> },
			{ name: 'Mods', children: <Mods /> },
			{ name: 'Images', children: <div /> },
			{ name: 'Data', children: <Data /> },
			{ name: 'Events', children: <div /> },
	], [])

	useEffect(() => {
			initialize()
	}, [])

	return <>
		<ErrorBoundary>
			<TitleBar />
			<div className={Style.pageContainer}>
				<ErrorBoundary>
					<Tabs tabs={tabs} />
				</ErrorBoundary>
				<ToastContainer
					position="top-center"
					theme="dark"
				/>
			</div>
		</ErrorBoundary>
	</>
};

export default App;
