// https://docs.expo.dev/guides/using-eslint/
const fs = require('node:fs');
const path = require('node:path');
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Import rules from tasky-docs/design/clients/apps/06-mobile.md (Folder structure › Import rules).
const features = fs
  .readdirSync(path.join(__dirname, 'src/features'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const boundaries = [
  { target: './src/core', from: ['./src/data', './src/features', './src/shared', './src/app'], message: 'core/ imports nothing outside core/.' },
  { target: './src/data', from: ['./src/features', './src/shared', './src/app'], message: 'data/ imports only core/ and other data/ modules.' },
  { target: './src/shared/ui', from: ['./src/data', './src/features', './src/app', './src/shared/components', './src/shared/session'], message: 'shared/ui is the design system: no domain imports.' },
  { target: './src/shared', from: ['./src/features', './src/app'], message: 'shared/ never imports features/ or app/.' },
  ...features.map((name) => ({
    target: `./src/features/${name}`,
    from: './src/features',
    except: [`./${name}`],
    message: 'A feature never imports another feature: navigate to its screen by route name.',
  })),
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'import/no-restricted-paths': ['error', { zones: boundaries }],
    },
  },
  {
    // Colors come only from src/shared/ui/palettes (JSON) through useTheme().
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: 'Literal[value=/^#[0-9A-Fa-f]{3,8}$/]', message: 'No hard-coded colors: use useTheme().colors (palettes live in src/shared/ui/palettes).' },
        { selector: 'Literal[value=/^rgba?\\(/]', message: 'No hard-coded colors: use useTheme().colors (palettes live in src/shared/ui/palettes).' },
      ],
    },
  },
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['react', 'react-*', 'react-native*', 'expo', 'expo-*', '@expo/*'], message: 'core/ is plain TypeScript: no React, React Native or Expo.' }] },
      ],
    },
  },
]);
