import { http } from '../http';
import type { Me } from './types';

export const tenancyApi = {
  me: () => http().get<Me>('/me'),
};
