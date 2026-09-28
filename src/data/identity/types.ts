export type { TokenPair as TokenResponse } from '@/core/auth/tokens';

export interface LoginRequest {
  email: string;
  password: string;
}

/** POST /auth/register. Time zone and language come from the device. */
export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  timeZone: string;
  language: string;
}

/** Register and resend return the id of the emailed code. The same answer for new and existing emails. */
export interface CodeRequestResponse {
  requestId: string;
}

export interface VerifyEmailRequest {
  requestId: string;
  code: string;
}

/** POST /auth/reset-password: the new password takes effect and every session ends. */
export interface ResetPasswordRequest {
  requestId: string;
  code: string;
  newPassword: string;
}

/** Error codes from Identity that screens handle. */
export const IdentityErrorCodes = {
  invalidCredentials: 'auth.invalid_credentials',
  emailNotVerified: 'email-not-verified',
  accountDeactivated: 'auth.account_deactivated',
  setupPending: 'auth.account_setup_pending',
  invalidCode: 'auth.invalid_code',
  invalidRefreshToken: 'auth.invalid_refresh_token',
  refreshTokenReused: 'auth.refresh_token_reused',
} as const;
