import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [{
    "name": "@storybook/addon-essentials",
    "options": {
      "docs": false
    }
  }, "@chromatic-com/storybook", "@storybook/experimental-addon-test"],
  "framework": {
    "name": "@storybook/react-vite",
    "options": {}
  }
};
export default config;
