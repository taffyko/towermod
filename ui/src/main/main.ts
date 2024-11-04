import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import path, { join } from 'path'
import os from 'os';
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import electronRemote from '@electron/remote/main';
import installExtension, { REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer'
import 'dotenv/config'

function createWindow() {
	// Create the browser window.
	const mainWindow = new BrowserWindow({
		transparent: true,
		titleBarStyle: 'hidden',
		width: 900,
		height: 670,
		show: false,
		autoHideMenuBar: true,
		...(process.platform === 'linux' ? { icon } : {}),
		webPreferences: {
			preload: join(__dirname, '../preload/preload.js'),
			sandbox: false
		}
	})

	mainWindow.on('ready-to-show', () => {
		mainWindow.show()
	})

	mainWindow.webContents.setWindowOpenHandler((details) => {
		shell.openExternal(details.url)
		return { action: 'deny' }
	})

	// HMR for renderer base on electron-vite cli.
	// Load the remote URL for development or the local html file for production.
	if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
		mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
	} else {
		mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
	}

	return mainWindow;
}

const reactDevToolsPath = process.env.REACT_DEV_TOOLS_PATH && path.resolve(os.homedir(), process.env.REACT_DEV_TOOLS_PATH)

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
	// Set app user model id for windows
	electronApp.setAppUserModelId('com.taffyko.towermod')

	if (reactDevToolsPath) {
		await session.defaultSession.loadExtension(reactDevToolsPath);
	}

	electronRemote.initialize()

	const mainWindow = createWindow()
	electronRemote.enable(mainWindow.webContents);

	app.on('activate', function () {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) createWindow()
	})
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
