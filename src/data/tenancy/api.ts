import { http } from '../http';
import type { Me, UpdateMeRequest } from './types';

export const tenancyApi = {
  me: () => http().get<Me>('/me'),

  /** PATCH /me: only what is sent changes (display name, time zone, language). */
  updateMe: (body: UpdateMeRequest) => http().patch<Me>('/me', { body }),
};
