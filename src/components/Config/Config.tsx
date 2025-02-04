import { useMemoWithCleanup } from "@/hooks";
import { api } from "@renderer/api";
import { useState } from "react";
import { toast } from "@/components/Toast";

export const Config = () => {
	const { data: game } = api.useGetGameQuery()
	const [setGame] = api.useSetGameMutation()
	const [newProject] = api.useNewProjectMutation()

	const [imageId, setImageId] = useState(0)

	const { data: blob } = api.useGetImageQuery(imageId)

	const [gamePath, setGamePath] = useState(game?.filePath || "")

	const href = useMemoWithCleanup(() => {
		if (blob) {
			const href = URL.createObjectURL(blob);
			return [href, () => URL.revokeObjectURL(href)]
		} else {
			return [null]
		}
	}, [blob])


	return <div>
		<button
			disabled={!game}
			onClick={async () => {
				await newProject()
				toast("New project initialized")
			}}
		>
			New project
		</button>
		<input type="text" value={gamePath} onChange={(e) => setGamePath(e.target.value)} />

		<button onClick={() => {
			setGame(gamePath)
		}}>
			Set game path
		</button>
		<input type="number" value={imageId} onChange={(e) => setImageId(parseInt(e.target.value))} />
		{href ? <img src={href} /> : <div>No image for ID {imageId}</div>}


		{/* <button
			onClick={() => {
				const greeting = greet("Mario")
				console.log(greeting)
				console.log("...")
			}}
		>Test</button> */}
	</div>
}

