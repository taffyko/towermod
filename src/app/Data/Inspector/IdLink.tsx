import { store, actions, dispatch, useAppSelector } from "@/redux";
import { getObjectDisplayName } from "@/util/dataUtil";
import { UniqueObjectLookup, UniqueTowermodObject, findObject } from "@/redux";
import { useContext } from "react";
import { OutlinerContext } from "../Outliner/Outliner";
import { Button } from "@/components/Button";

export function IdLink(props: { lookup: UniqueObjectLookup }) {
	const { lookup } = props;
	const obj = useAppSelector((state) => findObject(state.data, lookup as UniqueTowermodObject))
	const outlinerContext = useContext(OutlinerContext);
	const displayName = useAppSelector(s => getObjectDisplayName(s.data, obj))

	return <Button
		onClick={() => {
			dispatch(actions.setOutlinerValue(lookup))
			outlinerContext.jumpToItem(lookup)
		}}
	>
		{displayName}
	</Button>
}
