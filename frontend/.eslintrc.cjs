// ESLint configuration for React + TypeScript (Vite)
// Enables TS/TSX parsing and common React/React Hooks rules.
module.exports = {
	root: true,
	env: {
		browser: true,
		es2022: true,
	},
	ignorePatterns: [
		'dist/',
		'node_modules/',
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
		ecmaFeatures: { jsx: true },
	},
	settings: {
		react: { version: 'detect' },
	},
	plugins: [
		'react',
		'react-hooks',
		'@typescript-eslint',
		'react-refresh',
	],
	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:react-hooks/recommended',
	],
	rules: {
		// Vite + new JSX transform
		'react/react-in-jsx-scope': 'off',
		// Helpful with HMR and component boundaries
		'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
	},
};

