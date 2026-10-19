import { create } from 'zustand';

import type { JoinLink } from '@/core/links';

/**
 * A link that opened the app (D95), kept until someone is signed in to open it: through sign-in, sign-up and its code.
 * `email`: the address an invitation email went to, to fill in sign-up.
 */
export const usePendingLink = create<{ link: JoinLink | null; email: string | null; set(link: JoinLink): void; setEmail(email: string | null): void; clear(): void }>()((set) => ({
  link: null,
  email: null,
  set: (link) => set({ link, email: null }),
  setEmail: (email) => set({ email }),
  clear: () => set({ link: null, email: null }),
}));
