import { AppContext } from "@renderer/appContext";
import { useAppSelector } from "@renderer/hooks";
import { store } from "@renderer/store";
import { objectDisplayName } from "@/dataUtil";
import { UniqueObjectLookup, UniqueTowermodObject, findObject } from "@/reducers/data";
import { useContext } from "react";

export function IdLink(props: { lookup: UniqueObjectLookup }) {
	const { lookup } = props;
	const obj = useAppSelector((state) => findObject(state.data, lookup as UniqueTowermodObject))
	const appContext = useContext(AppContext);
	const displayName = objectDisplayName(store.getState().data, obj)

	return <button
		onClick={() => {
			appContext?.data?.setValue(lookup)
			appContext?.data?.outliner?.jumpToItem(lookup)
		}}
	>
		{displayName}
	</button>
}
