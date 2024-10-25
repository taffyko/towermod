import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Mods from './components/Mods';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Scrollbars } from 'react-custom-scrollbars-2';
import Style from './App.module.scss';
import { Tab, Tabs } from './components/Tabs';
import { useEffect, useMemo } from 'react';
import { TitleBar } from './components/TitleBar';
import { rpc } from './util';
import { Data } from './components/Data';

function initialize() {
  // FIXME
  rpc.setGamePath("C:\\Program Files (x86)\\Steam\\steamapps\\common\\TowerClimb\\TowerClimb_V1_Steam4.exe")
  rpc.loadModList()
}

const App = () => {
  const tabs: Tab[] = useMemo(() => [
      { name: 'Config', children: <div /> },
      { name: 'Mods', children: <Mods /> },
      { name: 'Images', children: <div /> },
      { name: 'Data', children: <Data /> },
      { name: 'Events', children: <div /> },
  ], [])

  useEffect(() => {
      initialize()
  }, [])

  return ( <>
      <ErrorBoundary>
        <TitleBar />
        <Scrollbars
          autoHide className={Style.pageContainer}
        >
          <ErrorBoundary>
            <Tabs tabs={tabs} />
          </ErrorBoundary>
          <ToastContainer
            position="top-center"
            theme="dark"
          />
        </Scrollbars>
      </ErrorBoundary>
    </>
  );
};

export default App;
