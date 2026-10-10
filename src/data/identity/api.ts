import { http } from '../http';
import type { ChangePasswordRequest, CodeRequestResponse, LoginRequest, RegisterRequest, ResetPasswordRequest, SessionInfo, TokenResponse, VerifyEmailRequest } from './types';

export const identityApi = {
  /** POST /auth/register: emails a 6-digit code. The account gets its password when the code is confirmed. */
  register: (body: RegisterRequest) => http().post<CodeRequestResponse>('/auth/register', { body, anonymous: true }),

  /** POST /auth/verify-email (204). Then sign in with the same email and password. */
  verifyEmail: (body: VerifyEmailRequest) => http().post('/auth/verify-email', { body, anonymous: true }),

  /** POST /auth/resend-verification: a new code for the same sign-up; returns a new request id. */
  resendVerification: (requestId: string) =>
    http().post<CodeRequestResponse>('/auth/resend-verification', { body: { requestId }, anonymous: true }),

  /** POST /auth/forgot-password: emails a reset code. Always returns a request id, account or not. Asking again sends a new code. */
  forgotPassword: (email: string) => http().post<CodeRequestResponse>('/auth/forgot-password', { body: { email }, anonymous: true }),

  /** POST /auth/validate-reset-code (204): checks the code before asking for the new password. */
  validateResetCode: (body: VerifyEmailRequest) => http().post('/auth/validate-reset-code', { body, anonymous: true }),

  /** POST /auth/reset-password (204): sets the password and ends every session. Then sign in. */
  resetPassword: (body: ResetPasswordRequest) => http().post('/auth/reset-password', { body, anonymous: true }),

  /** POST /auth/login. Right after verifying an email it can answer 503 with Retry-After; the client retries. */
  login: (body: LoginRequest) => http().post<TokenResponse>('/auth/login', { body, anonymous: true }),

  /** POST /auth/refresh: rotates the refresh token. */
  refresh: (refreshToken: string) =>
    http().post<TokenResponse>('/auth/refresh', { body: { refreshToken }, anonymous: true }),

  /** POST /auth/change-password: signed in; ends the other sessions and returns new tokens for this one. */
  changePassword: (body: ChangePasswordRequest) => http().post<TokenResponse>('/auth/change-password', { body }),

  /** GET /auth/sessions: the devices where the user is signed in, this one marked. */
  sessions: () => http().get<SessionInfo[]>('/auth/sessions'),

  /** DELETE /auth/sessions/{id}: signs one device out (204). */
  revokeSession: (id: string) => http().delete(`/auth/sessions/${id}`),

  /** POST /auth/logout-all: signs every device out, this one included (204). */
  logoutAll: () => http().post('/auth/logout-all'),

  /** POST /auth/logout: ends this device's session. An unknown token is not an error. */
  logout: (refreshToken: string) => http().post('/auth/logout', { body: { refreshToken }, anonymous: true }),
};
