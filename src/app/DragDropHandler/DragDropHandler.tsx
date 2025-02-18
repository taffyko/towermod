import { installMods, useTauriEvent } from '@/util'
import Style from './DragDropHandler.module.scss'
import { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App/appContext';
import { spin } from '../GlobalSpinner';

export function DragDropHandler() {
	const [dragFiles, setDragFiles] = useState<string[] | undefined>(undefined)
	const [isDragging, setIsDragging] = useState(false);
	const [success, setSuccess] = useState(false);
	const [failure, setFailure] = useState(false);
	const plural = dragFiles && dragFiles.length > 1

	const isValid = useMemo(() => {
		if (!dragFiles) { return true }
		for (const path of dragFiles) {
			if (path.endsWith('.towermod') || path.endsWith('.zip')) {
				return true
			}
		}
		return false
	}, [dragFiles])

	const appContext = useContext(AppContext);

	useTauriEvent('tauri://drag-enter', (e) => {
		setDragFiles(e.payload?.paths)
		setIsDragging(true);
		setSuccess(false);
		setFailure(false);
	});

	useTauriEvent('tauri://drag-leave', () => {
		setIsDragging(false);
		setSuccess(false);
		setFailure(false);
	});

	useTauriEvent('tauri://drag-drop', async (e) => {
		const dragFiles = e.payload?.paths;
		setIsDragging(false);
		if (dragFiles && isValid) {
			setSuccess(true);
			await installMods(dragFiles)
		} else {
			setFailure(true)
		}
	}, [isValid, dragFiles, appContext]);

	return <div className={`
		${Style.backdrop}
		${isDragging ? Style.active : ''}
		${!isValid ? Style.invalid : ''}
		${success ? Style.success : ''}
		${failure ? Style.failure : ''}
	`}>
		<div className={Style.outer}>
			<div className={Style.inner}>
				<div>
					{ isValid ? <>
						Drop here to install
					</> : <>
						{ plural ? "Files not valid" : "File is not valid" }
						<br/>
						<br/>
						Please drop a valid mod file <i>(ending in <code>.zip</code> or <code>.towermod</code>)</i> to install it.
					</> }
				</div>
			</div>
		</div>
	</div>
}
