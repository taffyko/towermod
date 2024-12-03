import { AppContext } from "@renderer/appContext";
import { useAppSelector } from "@renderer/hooks";
import { UniqueObjectLookup, UniqueTowermodObject, findObject } from "@shared/reducers/data";
import { useContext } from "react";

export function IdLink(props: { lookup: UniqueObjectLookup }) {
	const { lookup } = props;
	const obj = useAppSelector((state) => findObject(state.data, lookup as UniqueTowermodObject))
	const appContext = useContext(AppContext);

	// TODO
	return <button
		onClick={() => {
			appContext?.data?.setValue(lookup)
		}}
	>
		{Object.keys(obj)}
	</button>
}
