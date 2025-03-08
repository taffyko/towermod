import type { Meta, StoryObj } from "@storybook/react";
import { IconButton } from "@/components/IconButton";
import editImg from '@/icons/edit.svg';
import addImg from '@/icons/add.svg';
import refreshImg from '@/icons/refresh.svg';

const meta = {
	title: 'Components/IconButton',
	component: IconButton,
	parameters: { layout: "centered", },
	args: {
		flip: false,
		big: false,
		disabled: false,
		src: 'edit',
	},
	argTypes: {
		src: {
			control: 'select',
			options: ['edit', 'add', 'refresh'],
			mapping: { edit: editImg, add: addImg, refresh: refreshImg }
		}
	}
} satisfies Meta<typeof IconButton>;
export default meta;

export const MainStory: StoryObj<typeof meta> = { name: "IconButton" };
