/**
 * The API's field limits, in one place. Mirrors tasky-api: Platform/Validation (email) and each
 * module's *Limits class. Change both sides together.
 */
export const limits = {
  /** Platform EmailAttribute.MaxLength */
  emailMax: 254,
  /** IdentityLimits */
  passwordMin: 8,
  passwordMax: 128,
  displayNameMax: 100,
  /** EmailCode.Length: sign-up and reset codes */
  codeLength: 6,
  /** WorkspaceLimits */
  workspaceNameMax: 100,
} as const;
