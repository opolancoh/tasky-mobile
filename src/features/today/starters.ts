import type { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { TenantType } from '@/data/tenancy/types';

/** A starter idea on a new user's first day (M51): tapping it opens Quick add with its title. */
export type Starter = {
  /** Its key under today.starters in the i18n files: the title in every language. */
  id: string;
  icon: ComponentProps<typeof Feather>['name'];
  tone: 'accent' | 'success' | 'warn' | 'low';
};

/**
 * The starters per kind of account, in order. To add, edit or remove one, change this list and its title under
 * today.starters in en.json and es.json; nothing else needs to change. Keep each list short (4 fit on two lines).
 */
export const STARTERS: Record<TenantType, Starter[]> = {
  personal: [
    { id: 'dentist', icon: 'phone', tone: 'accent' },
    { id: 'groceries', icon: 'shopping-cart', tone: 'success' },
    { id: 'rent', icon: 'credit-card', tone: 'warn' },
    { id: 'weekend', icon: 'calendar', tone: 'low' },
  ],
  organization: [
    { id: 'report', icon: 'file-text', tone: 'accent' },
    { id: 'client', icon: 'mail', tone: 'success' },
    { id: 'meeting', icon: 'users', tone: 'warn' },
    { id: 'budget', icon: 'bar-chart-2', tone: 'low' },
  ],
};
