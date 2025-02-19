import { api, useGameImageUrl } from "@/api";
import { Button } from "@/components/Button";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { InspectorObject } from "../Data/Inspector";
import { assert, copyFile, deleteFile, filePicker, imageFromCollisionMask, openFolder, useRerender, useStateRef, useTwoWayBinding } from "@/util";
import { toast } from "../Toast";
import { spin } from "../GlobalSpinner";
import { throwOnError } from "@/components/Error";
import { dispatch } from "@/redux";
import { SpinBox } from "@/components/SpinBox";
import { Toggle } from "@/components/Toggle";
import { win32 as path } from "path";
import { ConfirmModal, openModal } from "../Modal";
import Style from './Images.module.scss'
import IconButton from "@/components/IconButton";

import folderOpenImg from '@/icons/folderOpen.svg'
import uploadImg from '@/icons/upload.svg'
import closeImg from '@/icons/close.svg'
import refreshImg from '@/icons/refresh.svg'
import { ImageMetadata } from "@towermod";

export default function Images() {
	const [dumpImages] = api.useDumpImagesMutation();
	const { data: imageDumpDir } = api.useImageDumpDirPathQuery();
	const { data: project } = api.useGetProjectQuery();

	const [imageId, setImageId] = useState(0)
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
				<Button onClick={onClickSetImage}>Set image</Button>
				<Toggle /> Show collision
			</div>
			<div className="hbox gap" style={{ overflow: 'hidden' }}>
				<div className="vbox gap grow">
					<div className="hbox gap center">
						<SpinBox value={imageId} onChange={setImageId} />
						<IconButton src={folderOpenImg} onClick={onClickBrowseOverrides} />
						<IconButton src={uploadImg} onClick={onClickSetImage} />
						<IconButton src={refreshImg} onClick={onClickReloadAllImages} />
						{ isOverridden ? <IconButton src={closeImg} onClick={onClickClearImage} /> : null }
						<Button onClick={onClickSetMask}>Set mask</Button>
					</div>
					<ImagePreview imageId={imageId} metadata={metadata} />
				</div>
				<div className="vbox gap grow">
					<InspectorObject value={metadata} onChange={setMetadata as any} />
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


function useDebounce(fn: () => void, ms: number) {
	const ref = useRef(0)
	clearTimeout(ref.current)
	ref.current = window.setTimeout(fn, ms)
}

function ImagePreview(props: {
	imageId: number,
	metadata?: ImageMetadata,
}) {
	const { imageId, metadata } = props;
	const imgUrl = useGameImageUrl(imageId);
	const rerender = useRerender();

	const [imgEl, setImgEl] = useStateRef<HTMLImageElement>();
	const width = 100;
	const height = Math.round(((imgEl?.naturalHeight ?? 0) / (imgEl?.naturalWidth ?? 0)) * width);

	const collisionImg = useMemo(() => {
		if (!metadata) { return }
		return imageFromCollisionMask(new Uint8Array(metadata.collisionMask), metadata.collisionPitch, metadata.collisionWidth, metadata.collisionHeight)
	}, [metadata])

	const [canvasEl, setCanvasEl] = useStateRef<HTMLCanvasElement>();
	useDebounce(() => {
		if (canvasEl) {
			canvasEl.width = metadata?.collisionWidth ?? width
			canvasEl.height = metadata?.collisionHeight ?? height
			const context = canvasEl.getContext('2d')!
			context.clearRect(0, 0, canvasEl.width, canvasEl.height)
			if (metadata && collisionImg) {
				context.drawImage(collisionImg, 0, 0)
			}
		}
	}, 5)

	if (!imgUrl) { return <span>No image</span> }

	return <div className={Style.previewContainer}>
		<img onLoad={() => rerender()} width={width} height={height} ref={setImgEl} className={Style.preview} src={imgUrl} />
		{ metadata ?
			<canvas id="collisionCanvas" style={{ width, height }} ref={setCanvasEl} className={Style.preview} />
		: null}
	</div>
}
