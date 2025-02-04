import { useMemoWithCleanup, useObjectUrl } from "@/util/hooks";
import { api } from "@/api";
import { useState } from "react";
import { toast } from "@/app/Toast";
import { Button } from "@/components/Button";
import { LineEdit } from "@/components/LineEdit";
import Text from "@/components/Text";

export const Config = () => {
	const { data: game } = api.useGetGameQuery()
	const [setGame] = api.useSetGameMutation()
	const [newProject] = api.useNewProjectMutation()

	const [imageId, setImageId] = useState(0)

	const { data: blob } = api.useGetImageQuery(imageId)

	const [gamePath, setGamePath] = useState(game?.filePath || "")

	const href = useObjectUrl(blob);
	console.log('href', href)

	return <div>
		<hr />
		<Text>Package legacy projects as playable mods</Text>
		<LineEdit value={gamePath} onChange={(e) => setGamePath(e.target.value)} />

		<Button onClick={() => setGame(gamePath)}>
			Set game path
		</Button>

		<input type="number" value={imageId} onChange={(e) => setImageId(parseInt(e.target.value))} />
		{href ? <img src={href} /> : <div>No image for ID {imageId}</div>}
		<Button
			disabled={!game}
			onClick={async () => {
				await newProject()
				toast("New project initialized")
			}}
		>
			New project
		</Button>
	</div>
}

