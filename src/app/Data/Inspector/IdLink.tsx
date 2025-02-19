import { AppContext } from "@/app/App/appContext";
import { useAppSelector } from "@/redux";
import { store } from "@/redux";
import { objectDisplayName } from "@/util/dataUtil";
import { UniqueObjectLookup, UniqueTowermodObject, findObject } from "@/redux";
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
