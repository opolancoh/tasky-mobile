const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Expo Go on Android lacks ExpoTopicSubscriptionModule, which expo-notifications loads on import; we never use topics.
const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === './TopicSubscriptionModule' && context.originModulePath.includes('expo-notifications')) {
    return { type: 'sourceFile', filePath: require.resolve('expo-notifications/build/TopicSubscriptionModule.js') };
  }
  return (defaultResolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
