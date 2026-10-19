import { createNavigationContainerRef, type ParamListBase } from '@react-navigation/native';
import { useEffect } from 'react';
import { Linking } from 'react-native';

import { parseJoinLink } from '@/core/links';
import { tasksApi } from '@/data/tasks/api';
import { usePendingLink } from '@/shared/links/pendingLinkStore';
import { useIsSignedIn } from '@/shared/session/SessionProvider';

/** The root navigator, for opening a link from outside any screen. */
export const navigationRef = createNavigationContainerRef<ParamListBase>();

/**
 * Links into the app (D95): `azignia://join/{code}` (a team's invite link) and `azignia://i/{token}` (an invitation
 * email), from the page they open in a browser. Kept in `usePendingLink` until someone is signed in, then opened as
 * Join; signed out, an email's invitation fills in sign-up's email. React Navigation's own linking leaves them alone.
 */
export function LinkWatcher() {
  const signedIn = useIsSignedIn();
  const link = usePendingLink((s) => s.link);

  useEffect(() => {
    const take = (url: string | null) => {
      const found = url ? parseJoinLink(url) : null;
      if (found) usePendingLink.getState().set(found);
    };
    Linking.getInitialURL().then(take);
    const sub = Linking.addEventListener('url', ({ url }) => take(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!link) return;
    if (!signedIn) {
      // Sign-up starts from the invited address (anyone with the link may read it: it was sent to them).
      if (link.kind === 'invitation')
        tasksApi.previewLink('invitation', link.code).then((p) => usePendingLink.getState().setEmail(p.email ?? null)).catch(() => undefined);
      return;
    }
    const open = () => {
      if (!navigationRef.isReady()) return false;
      navigationRef.navigate('JoinLink', link);
      usePendingLink.getState().clear();
      return true;
    };
    if (open()) return;
    const timer = setInterval(() => open() && clearInterval(timer), 200);
    return () => clearInterval(timer);
  }, [link, signedIn]);

  return null;
}
