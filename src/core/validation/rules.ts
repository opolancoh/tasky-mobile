import { limits } from './limits';

/**
 * Shape rules for kinds of values any feature can use. Each matches an API attribute
 * (tasky-api Platform/Validation), so a value never passes here and fails there.
 * Rules answer true or false; the feature's form validator picks the message.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** `name@domain.tld`, no spaces, at most 254 characters. API: `[Email]`. Pass the trimmed value. */
export const isEmail = (value: string): boolean => value.length <= limits.emailMax && EMAIL.test(value);

/** Identity's password rule: length only. */
export const isPassword = (value: string): boolean =>
  value.length >= limits.passwordMin && value.length <= limits.passwordMax;

/** `#RRGGBB`. API: `[HexColor]`. */
export const isHexColor = (value: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(value);

/** Digits only, of the code length. */
export const isCode = (value: string): boolean => new RegExp(`^\\d{${limits.codeLength}}$`).test(value);

/** Not empty after trimming. */
export const isFilled = (value: string): boolean => value.trim().length > 0;
