import { store, actions, dispatch, useAppSelector } from "@/redux";
import { useObjectDisplayName } from "@/appUtil";
import { UniqueObjectLookup, int } from "@/util";
import { Button } from "@/components/Button";
import { SpinBox } from "@/components/SpinBox";
import { api } from "@/api";
import { ObjectType } from "@towermod";
import { useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { ComboboxButton } from "@/components/Combobox";

export function IdLink(props: { lookup: UniqueObjectLookup, onChange?: (v: UniqueObjectLookup) => void }) {
	const { lookup, onChange } = props;
	const displayName = useObjectDisplayName(lookup)

	return <div className="hbox gap">
		{ onChange ?
			<LookupEdit lookup={lookup} onChange={onChange} />
		:
			<Button
				onClick={() => { dispatch(actions.setOutlinerValue(lookup)) }}
			>
				{displayName}
			</Button>
		}
	</div>
}


function LookupEdit(props: { lookup: UniqueObjectLookup, onChange?: (v: UniqueObjectLookup) => void }) {
	const { lookup, onChange } = props;
	switch (lookup._type) {
		case 'ObjectInstance':
			return <SpinBox small value={lookup.id} onChange={(v) => onChange?.({ ...lookup, id: v })} />
		case 'ObjectType':
			return <ObjectTypeEdit value={lookup.id} onChange={(v) => onChange?.({ ...lookup, id: v })} />
	}
	return undefined
}


function ObjectTypeEdit(props: { value: int, onChange: (v: int) => void }) {
	const { value: selectedId, onChange } = props;
	const [query, setQuery] = useState('')
	const { data: objectTypes } = api.useSearchObjectTypesQuery({ text: query } || skipToken)
	const name = objectTypes?.find((ot) => ot.id === selectedId)?.name
	const value = api.useGetObjectTypeQuery({ id: selectedId }).data || { name: name || '...', id: selectedId }

	return <ComboboxButton<{ name: string, id: int }>
		value={value}
		onChange={(value) => {
			onChange(value.id)
		}}
		onClick={() => {
			dispatch(actions.setOutlinerValue({ id: selectedId, _type: 'ObjectType' }))
		}}
		query={query}
		setQuery={setQuery}
		options={objectTypes ?? []}
	/>
}
