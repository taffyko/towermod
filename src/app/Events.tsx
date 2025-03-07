import { Combobox, ComboboxButton } from "@/components/Combobox";
import { Button } from "@/components/Button";
import { useState } from "react";

export function Events() {
	const options = { foo: 1, bar: 2, baz: 3 }

	const [value, setValue] = useState<undefined | { name: string, value: number }>(undefined)

	const [query, setQuery] = useState('')

	const filteredOptions = Object.entries(options)
		.filter(([key]) => key.includes(query))
		.map(([name, value]) => ({ name, value }))

	return <div className="vbox gap w-[178px]">
		<Button>{value?.name}</Button>
		<Combobox allowClear value={value} onChange={setValue} setQuery={setQuery} options={filteredOptions} />
		<br />
		<ComboboxButton value={value} onChange={setValue} query={query} setQuery={setQuery} options={filteredOptions} />
		<p>test</p>
	</div>
}
