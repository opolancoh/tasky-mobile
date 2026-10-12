import * as Application from 'expo-application';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

const expoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * This app's release (M46): the version from app.json (sent in X-Client) and, in a store build, the build number EAS
 * set. In Expo Go there is no build of our own. `updateUrl` is where testers get a newer build (M48): Play's internal
 * testing on Android, TestFlight on iOS (the App Store link once Azignia is published, pending-decisions.md).
 */
export const appInfo = {
  version: Constants.expoConfig?.version ?? '0.0.0',
  build: expoGo ? null : Application.nativeBuildVersion,
  expoGo,
  updateUrl: Platform.OS === 'android' ? `market://details?id=${Application.applicationId}` : 'itms-beta://',
};
