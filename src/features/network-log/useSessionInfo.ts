import { useTranslation } from 'react-i18next';

import { systemApi } from '@/data/system/api';
import { useMe } from '@/data/tenancy/queries';
import { appInfo } from '@/shared/appInfo';

import type { SessionInfo } from './shareText';

/** App version and build, server, language and the signed-in user, for what Share sends. */
export function useSessionInfo(): SessionInfo {
  const { i18n } = useTranslation();
  const me = useMe().data;
  const build = appInfo.expoGo ? 'Expo Go' : appInfo.build;
  return { app: build ? `${appInfo.version} (${build})` : appInfo.version, server: systemApi.host(), language: i18n.language, me };
}
