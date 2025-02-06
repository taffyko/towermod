
import { useMiniEventValue, useStateRef } from '@/util/hooks';
import Style from './Modal.module.scss';
import { modalsUpdated, thisModalContext, useIsModalOpen } from './modalStore';
import Scrollbars from '@/components/Scrollbars';

function ModalParent() {
	const modals = useMiniEventValue(modalsUpdated);
	const isModalOpen = !!modals.length;
	const [el, setEl] = useStateRef<HTMLDivElement>();

	return <div
		ref={setEl}
		className={`${Style.backdrop} ${isModalOpen ? Style.active: ''}`}
	>
		{modals.map((modalData, _idx) =>
			<thisModalContext.Provider key={modalData.id} value={{ id: modalData.id, parent: el }}>
				{modalData.content}
			</thisModalContext.Provider>
		)}
	</div>
}

export function ModalPageContainer(props: React.ComponentProps<'div'>) {
	const isModalOpen = useIsModalOpen();
	const { children, ...htmlProps } = props;
	return <>
		<ModalParent />
		<div
			{...htmlProps}
			// @ts-ignore
			inert={isModalOpen ? "" : undefined}
		>
			{children}
		</div>
	</>
}
