export async function blobToImage(blob: Blob) {
	const url = URL.createObjectURL(blob)
	const free = () => URL.revokeObjectURL(url)
	return [free, await urlToImage(url)] as const
}

export function urlToImage(url: string): Promise<HTMLImageElement> {
	const img = new Image()
	const promise = new Promise<HTMLImageElement>((resolve) => {
		img.onload = () => { resolve(img) }
		img.src = url
	})
	return promise
}

export function createCollisionMask(image: HTMLImageElement): { mask: Uint8Array, width: number, height: number, pitch: number } {
	// Determine size of our buffer. All buffers are rounded up to 128 bit pitch, just in case SSE can be used.
	const alignPitchBits = 64
	const alignPitchBytes = alignPitchBits / 8

	const width = image.width
	const height = image.height

	let pitch = Math.floor(width / 8)
	if (width % 8 !== 0) {
		pitch += 1 // 11 pixel width needs 2 bytes not 1 rounded
	}

	// Eg. a 20 byte pitch must round up to 32 (+12, 16 - 4)
	if (pitch % alignPitchBytes !== 0) {
		pitch += alignPitchBytes - (pitch % alignPitchBytes)
	}

	// If the pitch does not leave at least a 64 pixel gutter, increase it by 64 pixels.
	// This prevents false positives when a 64 pixel check from the far right edge can wrap around to the next line.
	if ((pitch * 8) - width < alignPitchBits) {
		pitch += alignPitchBytes
	}

	// Allocate and zero the memory
	const bits = new Uint8Array(height * pitch)
	bits.fill(0)

	const context = imageToCanvas(image)
	// Loop each pixel and set the bit in the bitmask
	for (let x = 0; x < width; x++) {
		for (let y = 0; y < height; y++) {
			// Set the bit (check alpha component)
			const bit = getPixelColor(context, x, y)[3] > 0.5 ? 1 : 0
			bits[y * pitch + Math.floor(x / 8)] |= bit << (7 - (x % 8))
		}
	}

	return {
		mask: bits,
		width: width,
		height: height,
		pitch: pitch,
	}
}

// returns RGBA tuple
function getPixelColor(context: CanvasRenderingContext2D, x: number, y: number) {
	return context.getImageData(x, y, 1, 1).data
}

function imageToCanvas(image: HTMLImageElement) {
	const canvas = document.createElement('canvas')
	canvas.width = image.width
	canvas.height = image.height
	const context = canvas.getContext('2d')!
	context.drawImage(image, 0, 0)
	return context
}

export async function imageFromCollisionMask(bits: Uint8Array, pitch: number, width: number, height: number): Promise<HTMLImageElement> {
	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const context = canvas.getContext('2d')!
	const imageData = context.createImageData(width, height)

	// Loop each pixel and set the bit in the bitmask
	for (let x = 0; x < width; x++) {
		for (let y = 0; y < height; y++) {
			const bit = bits[y * pitch + Math.floor(x / 8)] & (1 << (7 - (x % 8)))
			const alpha = bit > 0 ? 255 : 0
			const index = (y * width + x) * 4
			imageData.data[index] = 255
			imageData.data[index + 1] = 255
			imageData.data[index + 2] = 255
			imageData.data[index + 3] = alpha
		}
	}

	context.putImageData(imageData, 0, 0)
	return await urlToImage(canvas.toDataURL())
}
