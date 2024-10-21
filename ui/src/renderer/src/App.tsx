import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Mods from './components/Mods';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { Scrollbars } from 'react-custom-scrollbars-2';
import Style from './App.module.scss';
import { Tab, Tabs } from './components/Tabs/Tabs';
import { useEffect, useMemo } from 'react';
import { TitleBar } from './components/TitleBar/TitleBar';
import { rpc } from './util';

const App = () => {
  const tabs: Tab[] = useMemo(() => [
      { name: 'Config', children: <div /> },
      { name: 'Mods', children: <Mods /> },
      { name: 'Images', children: <div /> },
      { name: 'Data', children: <div /> },
      { name: 'Events', children: <div /> },
  ], [])

  useEffect(() => {
    // FIXME
    rpc.setGamePath("C:\\Program Files (x86)\\Steam\\steamapps\\common\\TowerClimb\\TowerClimb_V1_Steam4.exe")
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
