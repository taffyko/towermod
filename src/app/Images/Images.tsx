import { api, useGameImageUrl } from "@/api";
import { Button } from "@/components/Button";
import { useCallback, useState } from "react";
import { InspectorObject } from "../Data/Inspector";
import { assert, copyFile, deleteFile, filePicker, openFolder, useTwoWayBinding } from "@/util";
import { toast } from "../Toast";
import { spin } from "../GlobalSpinner";
import { throwOnError } from "@/components/Error";
import { dispatch } from "@/store";
import { SpinBox } from "@/components/SpinBox";
import { Toggle } from "@/components/Toggle";
import { win32 as path } from "path";
import IconButton from "@/components/IconButton";
import folderOpenImg from '@/icons/folderOpen.svg'
import uploadImg from '@/icons/upload.svg'
import closeImg from '@/icons/close.svg'
import { ConfirmModal, openModal } from "../Modal";

export default function Images() {
	const [dumpImages] = api.useDumpImagesMutation();
	const { data: imageDumpDir } = api.useImageDumpDirPathQuery();
	const { data: project } = api.useGetProjectQuery();

	const [imageId, setImageId] = useState(0)
	const href = useGameImageUrl(imageId);
	const { data: savedMetadata } = api.useGetImageMetadataQuery(imageId)
	const { data: isOverridden } = api.useIsImageOverriddenQuery(imageId)
	const [setSavedMetadata] = api.useSetImageMetadataMutation();

	const onChange = useCallback(() => {
		// FIXME
		setSavedMetadata
	}, [])
	const [metadata, setMetadata] = useTwoWayBinding(savedMetadata, onChange)

	const projectImagesDir = project ? path.join(project.dirPath, 'images') : undefined

	return <div className="vbox gap">
		<div className="hbox gap">
			<Button onClick={onClickDumpImages}>Dump images</Button>
			<Button disabled={!imageDumpDir} onClick={onClickBrowseDumpedImages}>Browse dumped images</Button>
		</div>
		{ project ? <>
			<div className="hbox gap">
				{/* <Button onClick={onClickReloadSelectedImage}>Reload selected image</Button> */}
				<Button onClick={onClickReloadAllImages}>Reload images</Button>
				<Button onClick={onClickSetImage}>Set image</Button>
				<Toggle /> Show collision
			</div>
			<SpinBox value={imageId} onChange={setImageId} />
			<div className="hbox gap">
				<div className="vbox gap grow">
					<div className="hbox gap">
						<IconButton src={folderOpenImg} onClick={onClickBrowseOverrides} />
						<IconButton src={uploadImg} onClick={onClickSetImage} />
						{ isOverridden ? <IconButton src={closeImg} onClick={onClickClearImage} /> : null }
						<Button onClick={onClickSetMask}>Set mask</Button>
					</div>
					{href ? <img src={href} /> : <div>No image for ID {imageId}</div>}
				</div>
				<div className="vbox gap grow">
					<InspectorObject value={metadata} onChange={setMetadata} />
				</div>
			</div>
		</> : null }
	</div>

	async function onClickSetMask() {

	}

	async function onClickClearImage() {
		let confirmed = false;
		await openModal(<ConfirmModal confirmText="Delete" onConfirm={() => { confirmed = true }}>
			<span>Are you sure you want to <b>delete</b> this custom image?</span>
		</ConfirmModal>)
		if (!confirmed) { return }
		assert(projectImagesDir, "Project not set")
		const imgPath = path.join(projectImagesDir, `${imageId}.png`)
		await deleteFile(imgPath)
		dispatch(api.util.invalidateTags([{ type: 'Image', id: String(imageId) }]))
		toast(`Deleted custom image '${imageId}'`)
	}

	async function onClickBrowseOverrides() {
		assert(projectImagesDir)
		openFolder(projectImagesDir)
		toast("Opened project images folder")
	}

	async function onClickSetImage() {
		assert(projectImagesDir, "Project not set")
		const imgPath = await filePicker({ filters: [{ name: 'PNG Image', extensions: ['png'] }] })
		if (!imgPath) { return }
		copyFile(imgPath, path.join(projectImagesDir, `${imageId}.png`))
		dispatch(api.util.invalidateTags([{ type: 'Image', id: String(imageId) }]))
		toast(`Updated image ${imageId}`)
	}

	async function onClickReloadAllImages() {
		dispatch(api.util.invalidateTags(['Image']))
		toast("Reloaded images")
	}

	async function onClickDumpImages() {
		await throwOnError(spin(dumpImages()));
		toast("Dumped images")
	}

	async function onClickBrowseDumpedImages() {
		if (!imageDumpDir) { return }
		toast("Opened dumped images folder")
		openFolder(imageDumpDir)
	}
}
