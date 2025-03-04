import { store, actions, dispatch, useAppSelector } from "@/redux";
import { useObjectDisplayName } from "@/appUtil";
import { UniqueObjectLookup } from "@/util";
import { Button } from "@/components/Button";
import { SpinBox } from "@/components/SpinBox";
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react'

export function IdLink(props: { lookup: UniqueObjectLookup, onChange?: (v: UniqueObjectLookup) => void }) {
	const { lookup, onChange } = props;
	const displayName = useObjectDisplayName(lookup)

	return <div className="hbox gap">
		{ onChange ? <LookupEdit lookup={lookup} onChange={onChange} /> : null }
		<Button
			onClick={() => {
				dispatch(actions.setOutlinerValue(lookup))
			}}
		>
			{displayName}
		</Button>
	</div>
}


function LookupEdit(props: { lookup: UniqueObjectLookup, onChange?: (v: UniqueObjectLookup) => void }) {
	const { lookup, onChange } = props;
	switch (lookup._type) {
		case 'ObjectInstance': case 'ObjectType':
			return <SpinBox small value={lookup.id} onChange={(v) => onChange?.({ ...lookup, id: v })} />
	}
	return undefined
}
