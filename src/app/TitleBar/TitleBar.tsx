import Style from './TitleBar.module.scss';
import { getCurrentWindow } from '@tauri-apps/api/window';
import minimize from '@/icons/minimize.svg';
import maximize from '@/icons/maximize.svg';
import unmaximize from '@/icons/unmaximize.svg';
import close from '@/icons/close.svg';
import { useEffect, useState } from 'react';
import IconButton from '@/components/IconButton';

const VERSION = "v1.0.6"; // FIXME

export const TitleBar = () => {

	const [maximized, setMaximized] = useState(false);
	useEffect(() => {
		const window = getCurrentWindow();
		const updateMaximizedState = async () => {
			const isMaximized = await window.isMaximized();
			setMaximized(isMaximized)
		}
		const result = window.onResized(updateMaximizedState);
		updateMaximizedState()
		return () => { result.then(unsubscribe => unsubscribe()) }
	}, [])


	return <div className={Style.titleBarRoot}>
		<div className={Style.titleBarContent}>
			<div className={Style.draggable}>
				<span className="centerbox">TowerMod {VERSION}</span>
			</div>
			<div className={Style.buttons}>
				<IconButton big src={minimize} tabIndex={-1} onClick={() => {
					const window = getCurrentWindow();
					window.minimize()
				}} />
				<IconButton big src={maximized ? unmaximize : maximize} tabIndex={-1} onClick={() => {
					const window = getCurrentWindow();
					window.toggleMaximize()
				}} />
				<IconButton big src={close} tabIndex={-1} onClick={() => {
					const window = getCurrentWindow();
					window.close()
				}} />
			</div>
		</div>
	</div>
}
