import { store, actions, dispatch, useAppSelector } from "@/redux";
import { useObjectDisplayName } from "@/appUtil";
import { UniqueObjectLookup } from "@/util";
import { useContext } from "react";
import { OutlinerContext } from "../Outliner/Outliner";
import { Button } from "@/components/Button";

export function IdLink(props: { lookup: UniqueObjectLookup }) {
	const { lookup } = props;
	const outlinerContext = useContext(OutlinerContext)
	const displayName = useObjectDisplayName(lookup)

	return <Button
		onClick={() => {
			dispatch(actions.setOutlinerValue(lookup))
			outlinerContext.jumpToItem(lookup)
		}}
	>
		{displayName}
	</Button>
}
