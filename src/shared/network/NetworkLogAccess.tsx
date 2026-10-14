import { useEffect } from 'react';

import { useMe } from '@/data/tenancy/queries';

import { setNetworkLogAllowed } from './networkLog';

/** Mounted in App while signed in: the Network log records only while /me has a platform role (support or admin). */
export function NetworkLogAccess() {
  const role = useMe().data?.platformRole;
  useEffect(() => setNetworkLogAllowed(!!role), [role]);
  return null;
}
