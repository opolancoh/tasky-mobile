[Tasky mobile](../../README.md) › [Structure](README.md) › core

# `src/core`

Plain TypeScript with no React, React Native or Expo imports (enforced by lint). It becomes the shared `api-client` and `domain` packages when the desktop app starts ([M4](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)).

```
src/core/
├── types.ts              Id, LocalDate, IsoDateTime, Version
├── http/
│   ├── client.ts         fetch with the API's rules
│   └── problem.ts        Problem documents → ApiError
├── auth/
│   └── tokens.ts         Access and refresh tokens, one refresh at a time
├── dates/
│   ├── localDate.ts      Today in a time zone; formatting a date or time (cached formatters)
│   └── reminders.ts      A reminder (date + time), the quick presets
└── validation/
    ├── rules.ts          isEmail, isPassword, isCode, isHexColor, isFilled
    ├── limits.ts         The API's field limits
    └── tags.ts           The API's #tag rule: typed tags in a title, valid names
```

## http/

**client.ts** (`createHttpClient`): every request to the API goes through it.

| Rule | Detail |
|---|---|
| Auth | `Authorization: Bearer` from the token manager; on a `401`, one refresh and one retry ([tokens.md](../auth/tokens.md)) |
| Retries | Network errors, timeouts, `502`, `503`, `504`: up to 3 retries with backoff, honoring `Retry-After` |
| Timeout | 15 seconds per attempt |
| Idempotency | Every `POST` gets an `Idempotency-Key`, reused by its retries |
| Concurrency | `ifMatch` sends the row version as `If-Match` |
| `anonymous` | No token and no refresh: sign-in, refresh, sign-out and the other `/auth` calls |

**problem.ts:** turns a problem document into `ApiError { status, code, errors, traceId, retryAfter }`. `status` 0 means no response (`code` `network` or `timeout`). Screens switch on `code`, never on the text.

## auth/tokens.ts

`createTokenManager` keeps the tokens in memory, backed by a `TokenStore` (secure storage, wired in `app/services.ts`): the saved access token is used while valid, one refresh runs at a time, and a refused refresh clears the tokens and calls `onEnded`. See [Auth › Tokens](../auth/tokens.md).

## dates/localDate.ts

Due dates are dates, not moments (`"2026-09-28"`). `todayIn(timeZone)` gives today in the **profile's** time zone; `formatLocalDate` and `formatLocalTime` format for display without shifting the day. Formatters are cached per locale and options: building an `Intl.DateTimeFormat` costs milliseconds in Hermes ([performance](../performance.md)). `nowIn` reads numbers through a fixed, non-display locale (`PARTS_LOCALE`, `en-CA`: Latin digits, 24-hour).

## dates/reminders.ts

`ReminderAt` (local date and time), `sameReminder`, and `reminderPresets(now)`: Later today 18:00 (until 17:00), Tomorrow, This weekend, Next week, all 9:00 ([M15](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)).

## validation/

Rules for kinds of values the API also checks, one per API attribute (`isEmail` ↔ `[Email]`), the API's limits (`emailMax` 254, `passwordMin` 8…), and the #tag rule (`tags.ts` ↔ `TagNames.cs`: `typedTags`, `removeTypedTag`, `newTagName`). When an API rule or limit changes, change its twin here ([06-mobile.md › Validation](../../../tasky-docs/design/clients/apps/06-mobile.md#validation)).

---

← [app](app.md) · ↑ [Structure](README.md) · Next: [data](data.md) →
