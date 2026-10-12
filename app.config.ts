import type { ConfigContext, ExpoConfig } from 'expo/config';

import active from './src/shared/ui/palettes/active.json';

/**
 * app.json plus the colors that come from the active palette (splash and Android icon background),
 * so changing src/shared/ui/palettes/active.json changes them too. Native colors need a rebuild to show.
 * For a store build (EAS, docs/releases.md): the API address from eas.json is required, and plain HTTP is
 * allowed only when that address is http:// (an API at home); Expo Go allows it anyway.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { light, dark } = require(`./src/shared/ui/palettes/${active.palette}.json`);
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (process.env.EAS_BUILD && !apiUrl) throw new Error('Set EXPO_PUBLIC_API_URL in eas.json (build.production.env) before building.');
  const cleartext = !!apiUrl?.startsWith('http://');

  const plugins: ExpoConfig['plugins'] = (config.plugins ?? []).map((plugin) =>
    Array.isArray(plugin) && plugin[0] === 'expo-splash-screen'
      ? (['expo-splash-screen', { ...plugin[1], backgroundColor: light.bg, dark: { backgroundColor: dark.bg } }] as [string, unknown])
      : plugin,
  );
  plugins.push(['expo-build-properties', { android: { usesCleartextTraffic: cleartext } }]);

  return {
    ...config,
    name: config.name ?? 'Azignia',
    slug: config.slug ?? 'azignia',
    ios: {
      ...config.ios,
      infoPlist: { ...config.ios?.infoPlist, ...(cleartext ? { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } } : {}) },
    },
    android: {
      ...config.android,
      adaptiveIcon: { ...config.android?.adaptiveIcon, backgroundColor: light.accentGradient[1] },
    },
    plugins,
  };
};
