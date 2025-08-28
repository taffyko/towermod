import '@/css/main.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App/App'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import { getCurrentWindow, PhysicalSize } from '@tauri-apps/api/window'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './api'

const window = getCurrentWindow()
function setWebviewSize(size: PhysicalSize) {
	const webview = getCurrentWebview()
	webview.setSize(size)
}
window.innerSize().then(() => setWebviewSize)
window.onResized(({ payload }) => setWebviewSize(payload))

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>
				<App />
			</Provider>
		</QueryClientProvider>
	</React.StrictMode>
)
