[Tasky mobile](../../README.md) › [Auth](README.md) › Sign in

# Sign in

Email and password in exchange for a session on this device.

## Contents

- [Steps](#steps)
- [Form rules](#form-rules)
- [Errors](#errors)
- [Code](#code)

## Steps

```mermaid
sequenceDiagram
    actor U as Person
    participant S as Sign in screen
    participant P as SessionProvider
    participant A as API
    U->>S: email, password, Sign in
    S->>S: check the form
    S->>P: signIn(email, password)
    P->>A: POST /auth/login
    A-->>P: access + refresh token
    P->>P: save both in secure storage
    P->>A: GET /me
    P->>P: apply the profile's language, remember the user
    P-->>S: status signedIn
    Note over S: the signed-out screens go away;<br/>the tabs open on Today
```

1. **Check the form** on the phone (see [Form rules](#form-rules)). Nothing is sent while it's incomplete.
2. **`POST /auth/login`** with the email (trimmed) and password. The request carries `X-Client` and `X-Device-Name`, which name this device in the sessions list.
3. **Save the tokens** in secure storage ([Auth › Tokens](README.md#tokens)).
4. **Load the account:** `GET /me`. The profile's language replaces the device's. There is no current workspace ([M31](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)): every view shows everything the user can see.
5. **Status `signedIn`.** Navigation swaps groups: Sign in and its history go away, and the tabs open on Today.

The same `signIn()` finishes [Sign up](sign-up.md) (after the code) and [Password reset](password-reset.md) (after the new password).

## Form rules

HIG timing ([06-mobile.md › UI](../../../tasky-docs/design/clients/apps/06-mobile.md#hig-rules-every-screen-follows)):

| Field | Checked | Message |
|---|---|---|
| Email | When you leave the field, and on Sign in | "Enter your email." / "Enter a valid email, like name@example.com." |
| Password | On Sign in | "Enter your password." |

Editing a field clears its error and any message from the server. The keyboard's Next goes to the password, and Go signs in.

Links: **Forgot password?** opens [Password reset](password-reset.md) with the typed email filled in. **Create an account** opens [Sign up](sign-up.md).

## Errors

Shown in a notice above the form, or under a field for a `400` with field errors.

| Response | Why | The app |
|---|---|---|
| `401 auth.invalid_credentials` | Wrong email or password. Also an account whose email was never verified: it has no password until its code is confirmed | "The email or password is incorrect." Ways out: Forgot password, or Create an account again |
| `403 auth.account_deactivated` | An organization admin deactivated the account | "This account has been deactivated…" |
| `503` with `Retry-After` | Right after verifying, the account is still being set up | Retried quietly (up to 3 times); if still not ready, "Your account is still being set up…" |
| No response | Offline or a 15-second timeout, after 3 retries | "Can't reach Tasky…" / "Tasky is taking too long…" |

A failed `/me` after a successful login shows the same messages; the saved tokens stay, so the next launch continues the session.

## Code

| Piece | Where |
|---|---|
| Screen | `src/features/auth/SignInScreen.tsx` |
| Form check | `validateSignIn()` in `src/features/auth/validation.ts`; email timing in `useEmailField.ts` |
| Sign in, load the account | `signIn()` and `loadAccount()` in `src/shared/session/SessionProvider.tsx` |
| Endpoint | `identityApi.login` in `src/data/identity/api.ts` |
| Retries | `src/core/http/client.ts` |

---

← [Launch](launch.md) · ↑ [Auth](README.md) · Next: [Sign up](sign-up.md) →
