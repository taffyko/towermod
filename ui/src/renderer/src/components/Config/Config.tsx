import { useAppSelector } from "@renderer/hooks"
import { rpc } from "@renderer/util"
import { toast } from "react-toastify";

export const Config = () => {
	const game = useAppSelector(s => s.main.game);
	return <div>
		<button
			disabled={!game}
			onClick={async () => {
				await rpc.newProject()
				toast("New project initialized")
			}}
		>
			New project
		</button>
	</div>
}
