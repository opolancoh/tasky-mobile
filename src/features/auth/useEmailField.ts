import { useState } from 'react';

import { isEmail } from '@/core/validation/rules';

/**
 * An email field with HIG timing: checked when the person leaves the field, not while they type.
 * Once shown, the error clears as soon as the value becomes valid.
 */
export function useEmailField(initial = '') {
  const [value, setValue] = useState(initial);
  const [left, setLeft] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const trimmed = value.trim();
  const valid = isEmail(trimmed);
  // Leaving an empty field says nothing (M126): "Enter your email" waits for the submit.
  const errorKey = valid ? undefined : trimmed ? (left || revealed ? 'emailInvalid' : undefined) : revealed ? 'emailRequired' : undefined;

  return {
    value,
    trimmed,
    valid,
    /** A key under auth.validation, or undefined. */
    errorKey,
    onChangeText: setValue,
    onBlur: () => setLeft(true),
    /** Shows the error now, e.g. when the keyboard's Go is pressed on an incomplete form. */
    reveal: () => setRevealed(true),
  };
}
