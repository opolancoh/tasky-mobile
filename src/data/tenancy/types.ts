import type { Id } from '@/core/types';

export type TenantRole = 'admin' | 'member';
export type TenantType = 'personal' | 'organization';

/** GET /me */
export interface Me {
  id: Id;
  email: string;
  displayName: string;
  /** IANA zone; decides when Today starts. */
  timeZone: string;
  /** "en" or "es" */
  language: string;
  tenantRole: TenantRole;
  /** A personal tenant has no name and is never shown. */
  tenant: { id: Id; type: TenantType; name: string | null };
}

/** PATCH /me: none can be cleared. */
export interface UpdateMeRequest {
  displayName?: string;
  timeZone?: string;
  language?: string;
}
