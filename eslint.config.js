import 'eslint-plugin-only-warn'
import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactCompiler from 'eslint-plugin-react-compiler'

export default tseslint.config(
	{ ignores: ['dist'] },
	{
		extends: [js.configs.recommended, tseslint.configs.recommended, reactCompiler.configs.recommended],
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
		},
		plugins: {
			'react-hooks': reactHooks,
			'react-refresh': reactRefresh,
			'@stylistic': stylistic,
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			// https://github.com/reactwg/react-compiler/discussions/18#discussioncomment-11009257
			// 'react-hooks/exhaustive-deps': 'off',
			'react-hooks/refs': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/triple-slash-reference': 'off',
			'@typescript-eslint/no-unused-expressions': ['warn', { allowShortCircuit: true, allowTernary: true }],
			'react-refresh/only-export-components': [
				'warn',
				{ allowConstantExport: true },
			],
			'@stylistic/semi': ['error', 'never', { "beforeStatementContinuationChars": "always" }],
			'@stylistic/semi-style': ['warn', 'first'],
			'@stylistic/indent': ['warn', 'tab'],
			'no-empty': 'off',
		},
	},
)
