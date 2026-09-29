[Tasky mobile](../../README.md) › [Auth](README.md) › Tokens and invalid tokens

# Tokens and invalid tokens

How the app keeps a valid access token, and what happens when the API says a token is no longer valid.

## Contents

- [Renewing before it expires](#renewing-before-it-expires)
- [When the API answers 401](#when-the-api-answers-401)
- [When the server ends the session](#when-the-server-ends-the-session)
- [Code](#code)

## Renewing before it expires

Before each signed-in request, the HTTP client asks the token manager for the access token:

- **Valid for over a minute:** used as it is.
- **Expiring within a minute, or expired:** the app refreshes first (`POST /auth/refresh`), saves the new pair, and sends the request with the new token.

Only one refresh runs at a time. Requests that need a token meanwhile wait for it and share the result.

## When the API answers 401

The API can still refuse a token the app thought was valid, for example after the session was ended elsewhere.

```mermaid
sequenceDiagram
    participant C as HTTP client
    participant T as Token manager
    participant A as API
    C->>A: GET /views/today (Bearer token)
    A-->>C: 401
    C->>T: refresh()
    T->>A: POST /auth/refresh
    alt new tokens
        A-->>T: 200
        T-->>C: true
        C->>A: GET /views/today (new token)
        A-->>C: 200
    else session refused
        A-->>T: 401 / 403
        T->>T: delete the tokens, end the session
        T-->>C: false
        Note over C: the request fails with its 401;<br/>the app is already on Sign in
    else can't reach the API
        T-->>C: network error
        Note over C: the request fails; the session is kept
    end
```

| Refresh result | The app | The person sees |
|---|---|---|
| New tokens | Saves them and resends the request once | Nothing |
| Refused (`401` / `403`) | [Ends the session](#when-the-server-ends-the-session) | Sign in |
| No response | Keeps the tokens; the request fails with a network error | That screen's error with Retry; still signed in |
| New tokens, but the request gets `401` again | No second refresh (no loops); the request fails with the `401` | That screen's error |

Sign-in, refresh, sign-out and the other `/auth` calls don't carry a token and never trigger a refresh: a `401` there means wrong credentials.

## When the server ends the session

The refresh is refused when the session is over on the server:

| Cause | API reason |
|---|---|
| Signed out on this device, or this session revoked from another device | `logout`, `revoked by user` |
| "Sign out of all devices" | `logout all devices` |
| Password changed or reset (every session ends) | `password changed`, `password reset` |
| Account deactivated | `user deactivated` (`403`) |
| A refresh token was used twice (looks stolen) | `refresh token reused` |
| The refresh token wasn't used for 30 days (it expired) | — |
| 90 days since sign-in | `maximum age reached` |

What the app does, once:

1. Deletes the tokens from secure storage.
2. Clears the query cache, so no data of the account stays on screen.
3. Forgets the current user and sets the status to `signedOut`. Navigation swaps to Sign in.

The workspace saved per user stays; it isn't secret and applies at the next sign-in.

## Code

| Piece | Where |
|---|---|
| Access token, refresh, one at a time | `createTokenManager()` in `src/core/auth/tokens.ts` |
| `401` → refresh → resend | `request()` in `src/core/http/client.ts` |
| What counts as refused, ending the session | `isSessionEnded` and `onEnded` in `src/app/services.ts` |
| Rotation and reuse on the API | `TokenIssuer.cs` in `tasky-api` (Identity) |

---

← [Password reset](password-reset.md) · ↑ [Auth](README.md) · Next: [Sign out](sign-out.md) →
