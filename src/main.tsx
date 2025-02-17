import '@/css/main.scss'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App/App'
import { Provider } from 'react-redux'
import { store } from './store'
import { getCurrentWindow, PhysicalSize } from '@tauri-apps/api/window'
import { getCurrentWebview } from '@tauri-apps/api/webview'

const window = getCurrentWindow();
function setWebviewSize(size: PhysicalSize) {
	const webview = getCurrentWebview();
	webview.setSize(size);
}
window.innerSize().then(() => setWebviewSize);
window.onResized(({ payload }) => setWebviewSize(payload));

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<React.StrictMode>
		<Provider store={store}>
			<App />
		</Provider>
	</React.StrictMode>
)
