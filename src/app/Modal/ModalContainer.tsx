
import { useMiniEventValue, useStateRef } from '@/util/hooks';
import Style from './Modal.module.scss';
import { modalsUpdated, thisModalContext } from './modalStore';

export function ModalParent() {
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
