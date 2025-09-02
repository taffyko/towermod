import api from '@/api'
import Config from '@/app/Config'
import { Data } from '@/app/Data'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { Events } from '@/app/Events'
import Images from '@/app/Images'
import { ModalParent } from '@/app/Modal'
import Mods from '@/app/Mods'
import { Tabs } from '@/app/Tabs'
import { TitleBar } from '@/app/TitleBar'
import { ToastContainer, toast } from '@/app/Toast'
import { installMods } from '@/appUtil'
import { showError } from '@/components/Error'
import { Portal } from '@/components/Portal'
import { actions, dispatch } from '@/redux'
import { useTauriEvent } from '@/util'
import { useEventListener, useIsInert, useMountEffect, useStateRef } from '@/util/hooks'
import { useEffect, useMemo } from 'react'
import { DragDropHandler } from '../DragDropHandler'
import { GlobalSpinner, spin } from '../GlobalSpinner'
import Style from './App.module.scss'

const App = () => {
	const { data: dataIsLoaded } = api.isDataLoaded.useQuery()
	const { data: game } = api.getGame.useQuery()

	useEffect(() => {
		dispatch(actions.setTabEnabled({ tab: 'Mods', enabled: !!game }))
		dispatch(actions.setTabEnabled({ tab: 'Images', enabled: !!game }))
		dispatch(actions.setTabEnabled({ tab: 'Data', enabled: !!dataIsLoaded }))
		dispatch(actions.setTabEnabled({ tab: 'Events', enabled: !!dataIsLoaded }))
	}, [game, dataIsLoaded])

	const tabs = useMemo(() => (
		{
			'Config': <Config />,
			'Mods': <Mods />,
			'Images': <Images />,
			'Data': <Data />,
			'Events': <Events />
		}
	), [])

	useMountEffect(() => {
		spin(api.init())
	})

	const [titleRef, setTitleRef] = useStateRef<HTMLDivElement>()
	const isInert = useIsInert()

	useEventListener(document.body, 'contextmenu', (e) => {
		if (e.target instanceof HTMLImageElement) {
			e.preventDefault()
		}
	})

	useTauriEvent('towermod/toast', (e) => {
		toast(e.payload)
	})

	useTauriEvent('towermod/request-install-mod', (e) => {
		// give time for tabs to finish mounting
		installMods([e.payload])
	}, [])

	useTauriEvent('towermod/error', (e) => {
		showError(e.payload)
	})

	return <>
		<div ref={setTitleRef} />
		<div className={Style.pageContainer}>
			<ErrorBoundary>
				<GlobalSpinner />
				<ToastContainer />
				<ModalParent />
				<DragDropHandler />
				<div
					inert={isInert}
					className={Style.pageContent}
				>
					<Portal parent={titleRef}>
						<TitleBar />
					</Portal>
					<Tabs tabs={tabs} />
				</div>
			</ErrorBoundary>
		</div>
	</>
}

export default App
