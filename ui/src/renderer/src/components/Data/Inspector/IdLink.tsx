import { useAppSelector } from "@renderer/hooks";
import { UniqueObjectLookup, UniqueTowermodObject, findObject } from "@shared/reducers/data";

export function IdLink(props: { lookup: UniqueObjectLookup }) {
	const { lookup } = props;
	const obj = useAppSelector((state) => findObject(state.data, lookup as UniqueTowermodObject))

	// TODO
	return <div>
		{Object.keys(obj)}
	</div>
}
