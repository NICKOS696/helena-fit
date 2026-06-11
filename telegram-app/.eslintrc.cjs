module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'vite.config.ts'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    // Контекст+хук в одном файле — допустимый паттерн, HMR не критичен.
    'react-refresh/only-export-components': 'off',
    // Кодовая база активно использует any и runtime-типы Telegram SDK.
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/ban-ts-comment': 'off',
    // Пустой catch используется намеренно (игнор ошибок опроса/трекинга).
    'no-empty': ['error', { allowEmptyCatch: true }],
  },
}
