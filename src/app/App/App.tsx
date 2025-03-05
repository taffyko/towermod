import Style from './App.module.scss';
import Mods from '@/app/Mods';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { Tabs } from '@/app/Tabs';
import { useEffect, useMemo } from 'react';
import { TitleBar } from '@/app/TitleBar';
import { Data } from '@/app/Data';
import { Events } from '@/app/Events'
import Images from '@/app/Images';
import Config from '@/app/Config';
import { useEventListener, useIsInert, useMountEffect, useStateRef } from '@/util/hooks';
import { ModalParent } from '@/app/Modal';
import { api } from '@/api';
import { ToastContainer, toast } from '@/app/Toast';
import { Portal } from '@/components/Portal';
import { GlobalSpinner, spin } from '../GlobalSpinner';
import { DragDropHandler } from '../DragDropHandler';
import { useTauriEvent } from '@/util';
import { installMods } from '@/appUtil';
import { awaitRtk } from '@/api/helpers';
import { actions, dispatch } from '@/redux';
import { showError } from '@/components/Error';

const App = () => {
	const { data: dataIsLoaded } = api.useIsDataLoadedQuery()
	const [init] = api.useInitMutation();
	const { data: game } = api.useGetGameQuery();

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
	), [dataIsLoaded, game])

	useMountEffect(async () => {
		awaitRtk(spin(init()))
	})

	const [titleRef, setTitleRef] = useStateRef<HTMLDivElement>();
	const isInert = useIsInert();

	useEventListener(document.body, 'contextmenu', (e) => {
		if (e.target instanceof HTMLImageElement) {
			e.preventDefault();
		}
	})

	useTauriEvent('towermod/toast', (e) => {
		toast(e.payload)
	})

	useTauriEvent('towermod/request-install-mod', (e) => {
		// give time for tabs to finish mounting
		installMods([e.payload]);
	}, [])

	useTauriEvent('towermod/error', (e) => {
		showError(e.payload);
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
					// @ts-ignore
					inert={isInert ? "" : undefined}
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
};

export default App;
