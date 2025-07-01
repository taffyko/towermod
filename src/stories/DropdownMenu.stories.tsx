import type { Meta, StoryObj } from "@storybook/react"
import { DropdownMenu, MenuItem, ToggleMenuItem } from "@/components/DropdownMenu"

function Story(props: React.ComponentProps<typeof DropdownMenu>) {
	return <DropdownMenu {...props}>
		<ToggleMenuItem>
			Toggle
		</ToggleMenuItem>
		<MenuItem>
			Exit
		</MenuItem>
		<MenuItem keepOpen>
			Keep open
		</MenuItem>
	</DropdownMenu>
}

const meta = {
	title: 'Components/DropdownMenu',
	component: Story,
	parameters: { layout: "centered" },
	args: {
		disabled: false,
	}
} satisfies Meta<typeof Story>

export default meta
type Story = StoryObj<typeof meta>

export const MainStory: Story = { name: 'DropdownMenu' }
