import { ErrorMsg } from "./ErrorMsg"
import { AlertModal } from "@/app/Modal"

export function ErrorModal(props: { children?: React.ReactNode, error: any }) {
	return <AlertModal title={"Error"}>
		{props.children}
		<ErrorMsg error={props.error} />
	</AlertModal>
}

