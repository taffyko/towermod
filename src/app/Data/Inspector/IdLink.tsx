import { actions, dispatch } from "@/redux";
import { useObjectDisplayName, useObjectIcon } from "@/appUtil";
import { UniqueObjectLookup, int } from "@/util";
import { Button } from "@/components/Button";
import { SpinBox } from "@/components/SpinBox";
import { api } from "@/api";
import { useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { ComboboxButton } from "@/components/Combobox";
import { Icon } from "@/components/Icon";

export function IdLink(props: { lookup: UniqueObjectLookup, onChange?: (v: UniqueObjectLookup) => void }) {
	const { lookup, onChange } = props;
	const displayName = useObjectDisplayName(lookup)
	const { data: url, hasIcon } = useObjectIcon(lookup)

	return <div className="hbox gap">
		{ onChange ?
			<LookupEdit lookup={lookup} onChange={onChange} />
		:
			<Button
				onClick={() => { dispatch(actions.setOutlinerValue(lookup)) }}
				icon={<Icon src={url} noReflow={hasIcon} className="w-[32px] h-[32px]"/>}
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
	const { data: icon } = useObjectIcon(value ? { _type: 'ObjectType', id: value.id } : undefined);

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
		icon={<Icon src={icon} />}
	/>
}
