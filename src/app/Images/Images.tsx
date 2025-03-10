import { api } from "@/api";
import { Button } from "@/components/Button";
import { useEffect, useMemo, useState } from "react";
import { InspectorObject } from "../Data/Inspector";
import { assert, blobToImage, copyFile, createCollisionMask, deleteFile, filePicker, imageFromCollisionMask, notNaN, openFolder, triggerTransition, useMemoAsync, useStateRef, useTwoWaySubmitBinding } from "@/util";
import { toast } from "../Toast";
import { spin } from "../GlobalSpinner";
import { awaitRtk } from "@/api/helpers";
import { actions, dispatch, useAppSelector } from "@/redux";
import { SpinBox } from "@/components/SpinBox";
import { Toggle } from "@/components/Toggle";
import { win32 as path } from "path";
import { ConfirmModal, openModal } from "../Modal";
import Style from './Images.module.scss'
import IconButton from "@/components/IconButton";
import { revealItemInDir } from '@tauri-apps/plugin-opener'

import folderOpenImg from '@/icons/folderOpen.svg'
import uploadImg from '@/icons/upload.svg'
import closeImg from '@/icons/close.svg'
import refreshImg from '@/icons/refresh.svg'
import { ImageMetadata } from "@towermod";
import { save } from "@tauri-apps/plugin-dialog";
import { exists, writeFile } from "@tauri-apps/plugin-fs";

export default function Images() {
	const [dumpImages] = api.useDumpImagesMutation();
	const { data: imageDumpDir } = api.useImageDumpDirPathQuery();
	const { data: project } = api.useGetProjectQuery();
	const projectImagesDir = project ? path.join(project.dirPath, 'images') : undefined

	return <div className="vbox gap grow">
		<div className="hbox gap">
			<Button onClick={onClickDumpImages}>Dump images</Button>
			<Button disabled={!imageDumpDir} onClick={onClickBrowseDumpedImages}>Browse dump</Button>
			<Button disabled={!projectImagesDir} onClick={onClickBrowseProjectImages}>Browse project images</Button>
		</div>
		{project ?
			<ImageEditing />
		:
			<div className="subtle">Load a saved Towermod project to see more options</div>
		}
	</div>
	async function onClickDumpImages() {
		await awaitRtk(spin(dumpImages()));
		toast("Dumped images")
	}

	async function onClickBrowseDumpedImages() {
		if (!imageDumpDir) { return }
		toast("Opened dumped images folder")
		openFolder(imageDumpDir)
	}

	async function onClickBrowseProjectImages() {
		if (!projectImagesDir) { return }
		toast("Opened custom images folder")
		openFolder(projectImagesDir)
	}
}

function ImageEditing() {
	const imageId = useAppSelector(s => s.app.imageId)
	const { data: imgUrl } = api.useGetGameImageUrlQuery(imageId);
	const { data: savedMetadata } = api.useGetImageMetadataQuery(imageId)
	const { data: isOverridden } = api.useIsImageOverriddenQuery(imageId)
	const [setImageMetadata] = api.useSetImageMetadataMutation();
	const { data: project } = api.useGetProjectQuery();
	const { data: imageDumpDir } = api.useImageDumpDirPathQuery();
	const projectImagesDir = project ? path.join(project.dirPath, 'images') : undefined

	const [metadata, setMetadata, isMetadataDirty, submitMetadata] = useTwoWaySubmitBinding(savedMetadata, (m) => m && setImageMetadata(m))
	const showCollision = useAppSelector(s => s.app.showImageCollisionPreview)

	return <>
		<div className="hbox gap">
			<Button onClick={onClickSetImage}>Set image</Button>
			<Toggle value={showCollision} onChange={(v) => dispatch(actions.setShowImageCollisionPreview(v))}>
				Show collision
			</Toggle>
		</div>
		<div className="hbox gap grow" style={{ overflow: 'hidden' }}>
			<div className="vbox gap grow">
				<div className="hbox gap items-center">
					<SpinBox style={{ width: '5rem' }} int value={imageId} onChange={id => dispatch(actions.setImageId(id))} />
					<IconButton disabled={!imgUrl} src={folderOpenImg} onClick={onClickBrowseImage} />
					<IconButton src={uploadImg} onClick={onClickSetImage} />
					<IconButton src={refreshImg} onClick={onClickReloadAllImages} />
					{ isOverridden ? <IconButton src={closeImg} onClick={onClickClearImage} /> : null }
					<Button disabled={!metadata} onClick={onClickSetMask}>Set mask</Button>
					<Button disabled={!metadata} onClick={onClickExportMask}>Export mask</Button>
				</div>
				<ImagePreview showCollision={showCollision} imageId={imageId} metadata={metadata ?? undefined} />
			</div>
			<div className="vbox gap grow">
				{ metadata
					? <Button disabled={!isMetadataDirty} onClick={() => submitMetadata()}>Save metadata</Button>
					: <Button style={{ alignSelf: 'stretch' }} onClick={onClickSetImage}>{ imgUrl ? "Add metadata" : "Add image" }</Button>
				}
				<InspectorObject value={metadata ?? undefined} onChange={setMetadata as any} />
			</div>
		</div>
	</>

	async function applyMaskFromImagePath(metadata: ImageMetadata, filePath: string): Promise<ImageMetadata> {
		const blob = await awaitRtk(spin(dispatch(api.endpoints.getFile.initiate(filePath))))
		if (!blob) { throw new Error("No data") }
		const [free, img] = await blobToImage(blob)
		try {
			const collision = createCollisionMask(img)
			return {...metadata, collisionMask: Array.from(collision.mask), collisionPitch: collision.pitch, collisionWidth: collision.width, collisionHeight: collision.height}
		} finally {
			free()
		}
	}

	async function onClickSetMask() {
		if (!metadata) { return }
		const filePath = await filePicker({ filters: [{ name: 'PNG Image', extensions: ['png'] }] })
		if (!filePath) { return }
		const newMetadata = await applyMaskFromImagePath(metadata, filePath);
		setImageMetadata(newMetadata)
	}

	async function onClickExportMask() {
		if (!metadata) { return }
		const filePath = await spin(save({
			title: "Save mask image",
			filters: [{ name: 'PNG image', extensions: ['png' ]}]
		}), true)
		if (!filePath) { return }
		const img = await imageFromCollisionMask(new Uint8Array(metadata.collisionMask), metadata.collisionPitch, metadata.collisionWidth, metadata.collisionHeight)
		const res = await fetch(img.src);
		const blob = await res.blob()
		const bytes = new Uint8Array(await blob.arrayBuffer())
		await writeFile(filePath, bytes)
		toast(`Saved mask image to "${path.basename(filePath)}"`)
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
		await dispatch(api.util.invalidateTags([{ type: 'Image', id: String(imageId) }]))
		toast(`Deleted custom image '${imageId}'`)
	}

	async function onClickBrowseImage() {
		if (isOverridden) {
			assert(projectImagesDir)
			revealItemInDir(path.join(projectImagesDir, `${imageId}.png`))
			toast("Opened image in file explorer")
		} else {
			assert(imageDumpDir)
			revealItemInDir(path.join(imageDumpDir, `${imageId}.png`))
			toast("Opened image in file explorer")
		}
	}

	async function onClickSetImage() {
		assert(projectImagesDir, "Project not set")
		const destImgPath = path.join(projectImagesDir, `${imageId}.png`)
		let imgPath
		if (!metadata && await exists(destImgPath)) {
			// If metadata is not set, but a custom image *has* been provided, generate metadata from that image instead of prompting for a new image
			imgPath = destImgPath
		} else {
			imgPath = await filePicker({ title: "Select image", filters: [{ name: 'PNG Image', extensions: ['png'] }] })
			if (!imgPath) { return }
			copyFile(imgPath, destImgPath)
		}
		dispatch(api.util.invalidateTags([{ type: 'Image', id: String(imageId) }]))
		if (!metadata) {
			let newMetadata: ImageMetadata = {
				_type: 'ImageMetadata',
				id: imageId,
				hotspotX: 0,
				hotspotY: 0,
				apoints: [],
				collisionWidth: 0,
				collisionHeight: 0,
				collisionPitch: 0,
				collisionMask: [],
			}
			newMetadata = await applyMaskFromImagePath(newMetadata, imgPath);
			submitMetadata(newMetadata);
		}
		toast(`Updated image ${imageId}`)
		return imgPath
	}
	async function onClickReloadAllImages() {
		dispatch(api.util.invalidateTags(['Image']))
		toast("Reloaded images")
	}
}

function ImagePreview(props: {
	imageId: number,
	showCollision: boolean,
	metadata?: ImageMetadata,
}) {
	const { imageId, metadata, showCollision } = props;
	const { data: imgUrl } = api.useGetGameImageUrlQuery(imageId);

	const [imgEl, setImgEl] = useStateRef<HTMLImageElement>();
	const [naturalWidth, setNaturalWidth] = useState<number | undefined>(undefined);

	const width = notNaN(naturalWidth) ? naturalWidth * 5 : 100;
	let heightOverWidth = 1
	if (notNaN(imgEl?.naturalHeight) && notNaN(imgEl?.naturalWidth) && imgEl.naturalWidth !== 0) {
		heightOverWidth = imgEl.naturalHeight / imgEl.naturalWidth
	}

	const height = Math.round(heightOverWidth * width);

	const collisionImg = useMemoAsync(async () => {
		if (!metadata) { return }
		return await imageFromCollisionMask(new Uint8Array(metadata.collisionMask), metadata.collisionPitch, metadata.collisionWidth, metadata.collisionHeight)
	}, [metadata])

	const [canvasEl, setCanvasEl] = useStateRef<HTMLCanvasElement>();
	if (canvasEl) {
		canvasEl.width = metadata?.collisionWidth ?? width
		canvasEl.height = metadata?.collisionHeight ?? height
		const context = canvasEl.getContext('2d')!
		context.clearRect(0, 0, canvasEl.width, canvasEl.height)
		if (metadata && collisionImg) {
			context.drawImage(collisionImg, 0, 0)
		}
	}

	useEffect(() => {
		setNaturalWidth(undefined)
		imgEl?.parentElement?.classList.add(Style.loading)
	}, [imgUrl])

	if (!imgUrl) { return <div className="centerbox grow">No image</div> }

	return <div className={Style.previewContainer}>
		<img onLoad={onImageLoad} width={width} height={height} ref={setImgEl} className={Style.preview} src={imgUrl} />
		{ metadata && showCollision ?
			<canvas style={{ width, height }} ref={setCanvasEl} className={Style.collision} />
		: null}
		<ImagePoints naturalWidth={naturalWidth} width={width} height={height} metadata={metadata} />
	</div>

	function onImageLoad() {
		setNaturalWidth(imgEl?.naturalWidth)
		triggerTransition(imgEl?.parentElement, Style.loading)
	}
}

function ImagePoints(props: {
	width: number,
	height: number,
	naturalWidth?: number,
	metadata?: ImageMetadata,
}) {
	const { width, height, naturalWidth, metadata } = props;

	if (!metadata || !naturalWidth) { return null }

	const coords = useMemo(() => {
		const arr: Array<[number, number]> = []
		const fac = width / naturalWidth;
		arr.push([metadata.hotspotX * fac, metadata.hotspotY * fac])
		for (const apoint of metadata.apoints) {
			arr.push([apoint.x * fac, apoint.y * fac])
		}
		return arr
	}, [width, height, metadata, naturalWidth])

	return <div style={{ width, height }} className={Style.points}>
		{ coords.map(([x, y], i) =>
			<div key={i} style={{ left: x, top: y }}><div /></div>
		)}
	</div>
}
