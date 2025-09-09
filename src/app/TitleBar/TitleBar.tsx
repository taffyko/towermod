import Style from './TitleBar.module.scss'
import { getCurrentWindow } from '@tauri-apps/api/window'
import minimizeImg from '@/icons/minimize.svg'
import maximizeImg from '@/icons/maximize.svg'
import unmaximizeImg from '@/icons/unmaximize.svg'
import closeImg from '@/icons/close.svg'
import { useEffect, useState } from 'react'
import IconButton from '@/components/IconButton'
import iconImg from '@/icons/icon.png'
import Text from '@/components/Text'
import chime from '@/audio/chime.ogg'
import api from '@/api'
import { ConfirmModal, openModal } from '../Modal'
import { getVersion, triggerTransition } from '@/util'

const VERSION = await getVersion()

export const TitleBar = () => {
	const { data: project, isLoading: isLoading1 } = api.getProject.useQuery()
	const { data: isDataLoaded, isLoading: isLoading2 } = api.isDataLoaded.useQuery()
	const { data: game, isLoading: isLoading3 } = api.getGame.useQuery()
	const isLoading = isLoading1 || isLoading2 || isLoading3

	const [maximized, setMaximized] = useState(false)
	useEffect(() => {
		const window = getCurrentWindow()
		const updateMaximizedState = async () => {
			const isMaximized = await window.isMaximized()
			setMaximized(isMaximized)
		}
		const result = window.onResized(updateMaximizedState)
		updateMaximizedState()
		return () => { result.then(unsubscribe => unsubscribe()) }
	}, [])

	let title = `Towermod v${VERSION}`
	if (!isLoading) {
		if (project) {
			title = `${title} — ${project.displayName}`
		} else if (isDataLoaded) {
			title = `${title} — Unsaved project`
		} else if (!game) {
			title = `${title} — (NO GAME SELECTED)`
		}
	}

	return <div className={Style.titleBarRoot}>
		<div className={Style.titleBarContent}>
			<div className={Style.gap} />
			<img className={Style.icon} src={iconImg} onClick={(e) => {
				const el = e.currentTarget
				triggerTransition(el, Style.active)

				const audio = new Audio(chime)
				audio.preservesPitch = false
				audio.playbackRate = 1.0 + (Math.random() - 0.5)*0.1
				audio.play()
			}} />
			<audio preload="auto" src={chime} />
			<div className={Style.gap} />
			<div className={Style.draggable}>
				<Text className="centerbox">{title}</Text>
			</div>
			<div className={Style.buttons}>
				<IconButton big src={minimizeImg} tabIndex={-1} onClick={() => {
					const window = getCurrentWindow()
					window.minimize()
				}} />
				<IconButton big src={maximized ? unmaximizeImg : maximizeImg} tabIndex={-1} onClick={() => {
					const window = getCurrentWindow()
					window.toggleMaximize()
				}} />
				<IconButton big src={closeImg} tabIndex={-1} onClick={() => {
					const window = getCurrentWindow()
					if (isDataLoaded) {
						openModal(
							<ConfirmModal confirmText="Quit" onConfirm={() => window.close()}>
								Any unsaved data will be lost.
							</ConfirmModal>
						)
					} else {
						window.close()
					}
				}} />
			</div>
		</div>
	</div>
}
