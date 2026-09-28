import { useQuery } from '@tanstack/react-query';

import { tenancyApi } from './api';
import { tenancyKeys } from './keys';

export const meQuery = { queryKey: tenancyKeys.me, queryFn: tenancyApi.me };

export const useMe = () => useQuery(meQuery);
