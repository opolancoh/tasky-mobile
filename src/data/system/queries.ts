import { useQuery } from '@tanstack/react-query';

import { systemApi } from './api';

/** The API's release, for Me › About (M48). */
export const useApiVersion = () => useQuery({ queryKey: ['api-version'], queryFn: systemApi.version });
