import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Mods from './components/Mods';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';

const App = () => {
  return ( <>
      <ErrorBoundary>
        <Mods />
      </ErrorBoundary>
      <ToastContainer
        position="top-center"
        theme="dark"
      />
    </>
  );
};

export default App;
