import { store, actions, dispatch, useAppSelector } from "@/redux";
import { objectDisplayName } from "@/util/dataUtil";
import { UniqueObjectLookup, UniqueTowermodObject, findObject } from "@/redux";
import { useContext } from "react";
import { OutlinerContext } from "../Outliner/Outliner";

export function IdLink(props: { lookup: UniqueObjectLookup }) {
	const { lookup } = props;
	const obj = useAppSelector((state) => findObject(state.data, lookup as UniqueTowermodObject))
	const outlinerContext = useContext(OutlinerContext);
	const displayName = objectDisplayName(store.getState().data, obj)

	return <button
		onClick={() => {
			dispatch(actions.setOutlinerValue(lookup))
			outlinerContext.jumpToItem(lookup)
		}}
	>
		{displayName}
	</button>
}
