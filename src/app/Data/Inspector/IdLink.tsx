import { store, actions, dispatch, useAppSelector } from "@/redux";
import { useObjectDisplayName } from "@/appUtil";
import { UniqueObjectLookup } from "@/util";
import { Button } from "@/components/Button";
import { SpinBox } from "@/components/SpinBox";

export function IdLink(props: { lookup: UniqueObjectLookup, onChange?: (v: UniqueObjectLookup) => void }) {
	const { lookup, onChange } = props;
	const displayName = useObjectDisplayName(lookup)

	return <>
		{ onChange ? <LookupEdit lookup={lookup} onChange={onChange} /> : null }
		<Button
			onClick={() => {
				dispatch(actions.setOutlinerValue(lookup))
			}}
		>
			{displayName}
		</Button>
	</>
}


function LookupEdit(props: { lookup: UniqueObjectLookup, onChange?: (v: UniqueObjectLookup) => void }) {
	const { lookup, onChange } = props;
	switch (lookup._type) {
		case 'ObjectInstance': case 'ObjectType':
			return <SpinBox value={lookup.id} onChange={(v) => onChange?.({ ...lookup, id: v })} />
	}
	return undefined
}
