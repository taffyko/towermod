import Mods from './components/Mods';
import { ErrorBoundary } from './ErrorBoundary';

const App = () => {
  return (
    <ErrorBoundary>
      <Mods />
    </ErrorBoundary>
  );
};

export default App;
