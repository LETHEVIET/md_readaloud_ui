module.exports = {
    env: {
      browser: true,
      es2022: true,
      node: true,
    },
    extends: [
      'eslint:recommended',
    ],
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['error', { vars: 'all', args: 'after-used', ignoreRestSiblings: false }],
      'no-console': 'warn',
    },
    globals: {
      ...require('globals').vite,
    },
  };