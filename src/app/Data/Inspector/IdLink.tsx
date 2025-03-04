import { store, actions, dispatch, useAppSelector } from "@/redux";
import { useObjectDisplayName } from "@/appUtil";
import { UniqueObjectLookup, int } from "@/util";
import { Button } from "@/components/Button";
import { SpinBox } from "@/components/SpinBox";
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react'
import { api } from "@/api";
import { ObjectType } from "@towermod";
import { useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";

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


function ObjectTypeEdit(props: { value: int, onChange: (v: int) => void }) {
	const { value, onChange } = props;
	const [query, setQuery] = useState('')
	const { data: objectTypes } = api.useSearchObjectTypesQuery(query || skipToken)

	return <Combobox value={value} onChange={onChange}>
		<ComboboxInput
			aria-label="ObjectType"
			onChange={(e) => setQuery(e.currentTarget.value)}
			placeholder="Search object types..."
		/>
		<ComboboxOptions>
			{objectTypes?.map((objectType) => (
				<ComboboxOption key={objectType.id} value={objectType.id}>
					{objectType.name}
				</ComboboxOption>
			))}
		</ComboboxOptions>
	</Combobox>
}
