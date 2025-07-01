import type { Preview } from "@storybook/react"
import "@/css/main.css"
import { DecoratorFunction } from "storybook/internal/types"
import React from "react"
import { Provider } from 'react-redux'
import { store } from '../src/redux'

const ReduxDecorator: DecoratorFunction = (Story, _storyContext) => {
	return <Provider store={store}>
		<Story />
	</Provider>
}

const preview: Preview = {
	decorators: [ReduxDecorator],
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		backgrounds: {
			values: [
				{ name: 'Dark', value: 'var(--color-root-bg)' },
			],
			default: 'Dark',
		}
	},
}

export default preview
