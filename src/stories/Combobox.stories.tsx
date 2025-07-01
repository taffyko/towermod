import type { Meta, StoryObj } from "@storybook/react"
import { Combobox } from "@/components/Combobox"
import React, { useMemo } from "react"

function Story(props: Omit<React.ComponentProps<typeof Combobox>, 'query' | 'setQuery' | 'options'> & { options: string[] }) {
	const { options, ...rest } = props
	const [query, setQuery] = React.useState('')
	const filteredOptions = useMemo(() => {
		return options
			.filter(option => option.toLowerCase().includes(query.toLowerCase()))
			.map(option => ({ name: option }))
	}, [options, query])
	return <Combobox query={query} setQuery={setQuery} options={filteredOptions} {...rest} />
}

const meta = {
	title: 'Components/Combobox',
	component: Story,
	parameters: {
		layout: "centered",
	},
	args: {
		disabled: false,
		allowClear: false,
		options: ['Foo', 'Bar', 'Baz'],
		placeholder: 'Enter value...',
	}
} satisfies Meta<typeof Story>

export default meta
type Story = StoryObj<typeof meta>

export const MainStory: Story = {
	name: 'Combobox',
}
