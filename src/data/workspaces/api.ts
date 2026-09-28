import { http } from '../http';
import type { Workspace } from './types';

export const workspacesApi = {
  list: () => http().get<Workspace[]>('/workspaces'),
};
