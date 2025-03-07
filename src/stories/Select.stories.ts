import type { Meta, StoryObj } from "@storybook/react";
import { Select } from "@/components/Select";

const meta = {
	title: 'Components/Select',
	component: Select,
	parameters: {
		layout: "centered",
	},
	args: {
		label: "",
		options: ['Foo', 'Bar', 'Baz'],
	}
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {};

export const Multi: Story = {
	args: {
		multiple: true,
	},
};

