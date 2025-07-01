import type { Meta, StoryObj } from "@storybook/react"
import { Button } from "@/components/Button"

const meta = {
	title: 'Components/Button',
	component: Button,
	parameters: { layout: "centered", },
	args: {
		disabled: false,
		children: "Button",
	}
} satisfies Meta<typeof Button>
export default meta

export const MainStory: StoryObj<typeof meta> = { name: "Button" }
