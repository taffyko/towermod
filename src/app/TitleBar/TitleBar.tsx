import Style from './TitleBar.module.scss';
import { getCurrentWindow } from '@tauri-apps/api/window';
import minimizeImg from '@/icons/minimize.svg';
import maximizeImg from '@/icons/maximize.svg';
import unmaximizeImg from '@/icons/unmaximize.svg';
import closeImg from '@/icons/close.svg';
import { useEffect, useState } from 'react';
import IconButton from '@/components/IconButton';
import iconImg from '@/icons/icon.png';
import { useStateRef } from '@/util/hooks';
import chime from '@/audio/chime.ogg';

const VERSION = "v0.2.0"; // FIXME

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


	const [audioEl, setAudioEl] = useStateRef<HTMLAudioElement>();

	return <div className={Style.titleBarRoot}>
		<div className={Style.titleBarContent}>
			<img className={Style.icon} src={iconImg} height="16" onClick={(e) => {
				const el = e.currentTarget;
				el.classList.add(Style.active)
				el.offsetTop
				el.classList.remove(Style.active)
				if (audioEl) {
					audioEl.volume = 0.1;
					audioEl.currentTime = 0;
					audioEl.play();
				}
			}} />
			<audio preload="auto" src={chime} ref={setAudioEl} />
			<div className={Style.draggable}>
				<span className="centerbox">TowerMod {VERSION}</span>
			</div>
			<div className={Style.buttons}>
				<IconButton big src={minimizeImg} tabIndex={-1} onClick={() => {
					const window = getCurrentWindow();
					window.minimize()
				}} />
				<IconButton big src={maximized ? unmaximizeImg : maximizeImg} tabIndex={-1} onClick={() => {
					const window = getCurrentWindow();
					window.toggleMaximize()
				}} />
				<IconButton big src={closeImg} tabIndex={-1} onClick={() => {
					const window = getCurrentWindow();
					window.close()
				}} />
			</div>
		</div>
	</div>
}
