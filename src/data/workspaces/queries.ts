import { useQuery } from '@tanstack/react-query';

import { workspacesApi } from './api';
import { workspaceKeys } from './keys';

export const workspacesQuery = { queryKey: workspaceKeys.all, queryFn: workspacesApi.list };

export const useWorkspaces = () => useQuery(workspacesQuery);
