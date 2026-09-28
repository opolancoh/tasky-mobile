import type { ConfigContext, ExpoConfig } from 'expo/config';

import active from './src/shared/ui/palettes/active.json';

/**
 * app.json plus the colors that come from the active palette (splash and Android icon background),
 * so changing src/shared/ui/palettes/active.json changes them too. Native colors need a rebuild to show.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { light, dark } = require(`./src/shared/ui/palettes/${active.palette}.json`);
  const plugins: ExpoConfig['plugins'] = (config.plugins ?? []).map((plugin) =>
    Array.isArray(plugin) && plugin[0] === 'expo-splash-screen'
      ? (['expo-splash-screen', { ...plugin[1], backgroundColor: light.bg, dark: { backgroundColor: dark.bg } }] as [string, unknown])
      : plugin,
  );
  return {
    ...config,
    name: config.name ?? 'Tasky',
    slug: config.slug ?? 'tasky',
    android: {
      ...config.android,
      adaptiveIcon: { ...config.android?.adaptiveIcon, backgroundColor: light.accentGradient[1] },
    },
    plugins,
  };
};
