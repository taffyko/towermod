import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { ComboboxButton } from "@/components/Combobox";
import React, { useMemo } from "react";

function Story(props: Omit<React.ComponentProps<typeof ComboboxButton>, 'query' | 'setQuery' | 'options' | 'value' | 'setValue'> & { options: string[] }) {
	const { options, ...rest } = props;
	const [query, setQuery] = React.useState('');
	const [value, setValue] = React.useState<{ name: string } | undefined>();
	const filteredOptions = useMemo(() => {
		return options
			.filter(option => option.toLowerCase().includes(query.toLowerCase()))
			.map(option => ({ name: option }))
	}, [options, query])
	return <ComboboxButton value={value} onChange={setValue} query={query} setQuery={setQuery} options={filteredOptions} {...rest} />;
}

const meta = {
	title: 'Components/ComboboxButton',
	component: Story,
	parameters: {
		layout: "centered",
	},
	args: {
		options: ['Foo', 'Bar', 'Baz'],
		onClick: fn(),
	}
} satisfies Meta<typeof Story>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MainStory: Story = {
	name: 'ComboboxButton',
};
