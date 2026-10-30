import { useEffect } from 'react';

import { useMe } from '@/data/tenancy/queries';

import { setErrorDetailsAllowed } from './errorDetails';
import { setNetworkLogAllowed } from './networkLog';

/**
 * Mounted in App while signed in: the Network log records, and error details show (M119), only while /me has a platform
 * role (support or admin). Details keep the last answer on the device.
 */
export function NetworkLogAccess() {
  const me = useMe().data;
  const role = me?.platformRole;
  useEffect(() => setNetworkLogAllowed(!!role), [role]);
  useEffect(() => {
    if (me) setErrorDetailsAllowed(!!me.platformRole);
  }, [me]);
  return null;
}
