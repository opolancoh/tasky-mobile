import { http } from '../http';
import type { ApiVersion } from './types';

/** The API's root: the base URL without the contract version ("…/api/v1" → "…/api"). */
const apiRoot = () => http().baseUrl.replace(/\/v\d+\/?$/, '');

export const systemApi = {
  /** Outside /api/v1 and anonymous (04-api.md, Version and health). */
  version: () => http().get<ApiVersion>(`${apiRoot()}/version`, { anonymous: true }),

  /** The server the app talks to, e.g. "192.168.1.20:5186", for About. */
  host: () => http().baseUrl.replace(/^https?:\/\//, '').split('/')[0],
};
