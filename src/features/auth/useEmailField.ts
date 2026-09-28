import { useState } from 'react';

import { isEmail } from '@/core/validation/rules';

/**
 * An email field with HIG timing: checked when the person leaves the field, not while they type.
 * Once shown, the error clears as soon as the value becomes valid.
 */
export function useEmailField(initial = '') {
  const [value, setValue] = useState(initial);
  const [left, setLeft] = useState(false);
  const trimmed = value.trim();
  const valid = isEmail(trimmed);
  const errorKey = !left || valid ? undefined : trimmed ? 'emailInvalid' : 'emailRequired';

  return {
    value,
    trimmed,
    valid,
    /** A key under auth.validation, or undefined. */
    errorKey,
    onChangeText: setValue,
    onBlur: () => setLeft(true),
    /** Shows the error now, e.g. when the keyboard's Go is pressed on an incomplete form. */
    reveal: () => setLeft(true),
  };
}
