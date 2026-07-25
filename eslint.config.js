import { defineConfig } from 'eslint/config'
import {
  parser as typescriptParser,
  plugin as typescriptPlugin,
} from 'typescript-eslint'

const sharedRules = {
  'no-console': ['error', { allow: ['error', 'warn'] }],
  'no-eval': 'error',
  'no-new-func': 'error',
  'no-restricted-imports': [
    'error',
    {
      paths: [
        {
          name: 'class-variance-authority',
          message: 'Rudralipi does not use cva.',
        },
        {
          name: 'cn',
          message: 'Rudralipi does not use cn.',
        },
        {
          name: 'cva',
          message: 'Rudralipi does not use cva.',
        },
      ],
    },
  ],
  'no-restricted-syntax': [
    'error',
    {
      selector: 'ImportNamespaceSpecifier',
      message: 'Use named imports.',
    },
    {
      selector: 'ImportDefaultSpecifier',
      message: 'Use named imports, including `default as name` when required.',
    },
    {
      selector: "NewExpression[callee.name='Date']",
      message: 'Use Day.js for date and time operations.',
    },
    {
      selector: "CallExpression[callee.name='Date']",
      message: 'Use Day.js for date and time operations.',
    },
  ],
}

export default defineConfig([
  {
    ignores: [
      '.worktrees/**',
      '**/coverage/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
    rules: sharedRules,
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
    },
    rules: {
      ...sharedRules,
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'inline-type-imports',
          prefer: 'type-imports',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
])
