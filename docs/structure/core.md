[Azignia mobile](../../README.md) › [Structure](README.md) › core

# `src/core`

Plain TypeScript with no React, React Native or Expo imports (enforced by lint). It becomes the shared `api-client` and `domain` packages when the desktop app starts ([M4](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)).

```
src/core/
├── types.ts              Id, LocalDate, IsoDateTime, Version
├── links.ts              parseJoinLink: a team's invite link or an invitation email's, as a link or a pasted code (D95)
├── http/
│   ├── client.ts         fetch with the API's rules
│   ├── httpLog.ts        HttpLogger (each request with its headers, response or error with headers and raw body), masking, the development terminal log
│   └── problem.ts        Problem documents → ApiError
├── auth/
│   └── tokens.ts         Access and refresh tokens, one refresh at a time
├── dates/
│   ├── localDate.ts      Today in a time zone; formatting a date or time (cached formatters)
│   ├── calendar.ts       Weeks from Monday, months: a month's weeks, its first and last day (Calendar, M72)
│   └── reminders.ts      A reminder (date + time), the quick presets
├── text/
│   └── collate.ts        One shared Intl.Collator, byName (sorting never builds one in render)
└── validation/
    ├── rules.ts          isEmail, isPassword, isCode, isHexColor, isFilled
    ├── limits.ts         The API's field limits
    └── tags.ts           The API's tag name rule (titles are plain text, M31)
```

## http/

**client.ts** (`createHttpClient`): every request to the API goes through it.

| Rule | Detail |
|---|---|
| Auth | `Authorization: Bearer` from the token manager; on a `401`, one refresh and one retry ([tokens.md](../auth/tokens.md)) |
| Retries | Network errors, timeouts, `502`, `503`, `504`: reads up to 3 retries with backoff, honoring `Retry-After`; writes fail fast (none without a response, one for 502/503/504; `retriesFor`, M90) |
| Timeout | 15 seconds per attempt |
| Idempotency | Every `POST` gets an `Idempotency-Key`, reused by its retries |
| Concurrency | `ifMatch` sends the row version as `If-Match` |
| `anonymous` | No token and no refresh: sign-in, refresh, sign-out and the other `/auth` calls |
| `log` | Every request (with its headers), response and error (with headers and the body as received), wired in `app/services.ts`: the Metro terminal in development, and the Network log (M53) |

**httpLog.ts** (`createConsoleHttpLogger`): one line per event in color (requests cyan, 2xx green, 4xx and retries yellow, 5xx and no response red), a request and its response or error paired by number, the time in ISO 8601, the path, and the body as compact JSON (arrays as `[n items]`, two levels, 120 characters; passwords, secrets, any key ending in `token` and a request's `code` as `***`; `redactHeaders` shows Authorization as `Bearer ***`; a validation error shows each field's first message). `EXPO_PUBLIC_HTTP_LOG` in `.env.local`: `all` (default), `errors`, `off`; restart Metro after changing it.

```
→ #14  2026-10-12T16:44:27.246Z  GET    /api/v1/home?limit=5
← #14  2026-10-12T16:44:27.342Z  200    {"invitations":[0 items],"toAnswer":{…},…}  96ms
✕ #16  2026-10-12T16:44:30.190Z  401    {"code":"auth.token_expired"}  12ms → refreshing
```

**problem.ts:** turns a problem document into `ApiError { status, code, errors, traceId, retryAfter }`. `status` 0 means no response (`code` `network` or `timeout`). Screens switch on `code`, never on the text.

## auth/tokens.ts

`createTokenManager` keeps the tokens in memory, backed by a `TokenStore` (secure storage, wired in `app/services.ts`): the saved access token is used while valid, one refresh runs at a time, and a refused refresh clears the tokens and calls `onEnded`. See [Auth › Tokens](../auth/tokens.md).

## dates/localDate.ts

Due dates are dates, not moments (`"2026-09-28"`). `todayIn(timeZone)` gives today in the **profile's** time zone; `formatLocalDate` and `formatLocalTime` format for display without shifting the day; `formatInstant` shows a UTC moment ("created at") in a time zone. Formatters are cached per locale and options: building an `Intl.DateTimeFormat` costs milliseconds in Hermes ([performance](../performance.md)). `nowIn` reads numbers through a fixed, non-display locale (`PARTS_LOCALE`, `en-CA`: Latin digits, 24-hour).

## dates/reminders.ts

`ReminderAt` (local date and time), `sameReminder`, and `reminderPresets(now)`: Later today 18:00 (until 17:00), Tomorrow, This weekend, Next week, all 9:00 ([M15](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)). `earliestReminder(now)`: the next quarter hour, the earliest the pickers offer ([M95](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)).

## validation/

Rules for kinds of values the API also checks, one per API attribute (`isEmail` ↔ `[Email]`), the API's limits (`emailMax` 254, `passwordMin` 8…), and the tag name rule (`tags.ts` ↔ `TagNames.cs`: `newTagName`, `stripInvalidTagChars`). When an API rule or limit changes, change its twin here ([06-mobile.md › Validation](../../../azignia-docs/design/clients/apps/06-mobile.md#validation)).

---

← [app](app.md) · ↑ [Structure](README.md) · Next: [data](data.md) →
