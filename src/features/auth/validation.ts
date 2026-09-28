import { isEmail, isFilled, isPassword } from '@/core/validation/rules';

/**
 * Form validators for the auth screens: they combine the shared rules (core/validation) and return
 * keys under auth.validation. The API checks again; this only saves a round trip.
 */

export type SignInField = 'email' | 'password';

export function validateSignIn(email: string, password: string): Partial<Record<SignInField, string>> {
  const errors: Partial<Record<SignInField, string>> = {};
  if (!isFilled(email)) errors.email = 'emailRequired';
  else if (!isEmail(email.trim())) errors.email = 'emailInvalid';
  if (!password) errors.password = 'passwordRequired';
  return errors;
}

export type SignUpField = 'displayName' | 'email' | 'password';

export function validateSignUp(displayName: string, email: string, password: string): Partial<Record<SignUpField, string>> {
  const errors: Partial<Record<SignUpField, string>> = {};
  if (!isFilled(displayName)) errors.displayName = 'nameRequired';
  if (!isFilled(email)) errors.email = 'emailRequired';
  else if (!isEmail(email.trim())) errors.email = 'emailInvalid';
  if (!password) errors.password = 'passwordRequired';
  else if (!isPassword(password)) errors.password = 'passwordTooShort';
  return errors;
}
