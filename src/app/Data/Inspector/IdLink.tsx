import { store, actions, dispatch, useAppSelector } from "@/redux";
import { useObjectDisplayName } from "@/appUtil";
import { UniqueObjectLookup, UniqueTowermodObject, findObject } from "@/redux";
import { useContext } from "react";
import { OutlinerContext } from "../Outliner/Outliner";
import { Button } from "@/components/Button";

export function IdLink(props: { lookup: UniqueObjectLookup }) {
	const { lookup } = props;
	// FIXME: mixture of full objects and lookups being used
	const obj = useAppSelector((state) => { return lookup._type !== 'ObjectType' ? findObject(state.data, lookup as UniqueTowermodObject) : lookup });
	const outlinerContext = useContext(OutlinerContext);
	const displayName = useObjectDisplayName(obj as any)

	return <Button
		onClick={() => {
			dispatch(actions.setOutlinerValue(lookup))
			outlinerContext.jumpToItem(lookup)
		}}
	>
		{displayName}
	</Button>
}
