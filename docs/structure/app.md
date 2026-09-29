[Tasky mobile](../../README.md) › [Structure](README.md) › app

# `src/app`

Startup and wiring only. The one layer that may import everything; nothing imports it.

```
src/app/
├── App.tsx              Providers, fonts, splash, navigation theme
├── config.ts            EXPO_PUBLIC_* settings: the API address
├── services.ts          The single HTTP client and token manager, wired to Expo
├── queryClient.ts       TanStack Query defaults
└── navigation/
    ├── RootNavigator.tsx  Every route, grouped by session status
    └── tabs.tsx           The bottom tab bar and its + button
```

## App.tsx

Providers, outermost first:

| Provider | Gives |
|---|---|
| `SafeAreaProvider` | Safe-area insets (notch, home indicator) |
| `ThemeProvider` | The active palette in light or dark, following the OS |
| `QueryClientProvider` | The server-data cache |
| `SessionProvider` | `useSession()`: sign in, sign out, retry; runs the [launch](../auth/launch.md) |

`Root` loads the Figtree fonts, keeps the splash up until the fonts are loaded and the session is checked, builds React Navigation's theme from the palette, and renders `Navigation`.

## config.ts

`apiUrl`: `EXPO_PUBLIC_API_URL` if set; otherwise, in development, the Mac that runs Metro (from the address the app loaded its bundle from) at port 5186. The simulator, an emulator and a phone on the same Wi-Fi all work without setup.

## services.ts

Created once at startup:

| Instance | Wiring |
|---|---|
| `httpClient` | The API address, 15-second timeout, headers on every request (`X-Client: ios/1.0.0`, `X-Device-Name`, `Accept-Language`), UUIDs for `Idempotency-Key` |
| `tokenStore` | Secure storage (`expo-secure-store`), key `tasky.tokens` |
| `tokenManager` | The store, `POST /auth/refresh`, and what a refused session does: clear the query cache and set the status to `signedOut` |

`configureHttp(httpClient)` hands the client to `src/data`; `httpClient.setAuth(tokenManager)` adds the token to signed-in requests.

## queryClient.ts

- Data is fresh for 30 seconds.
- A failed query retries once, but never for a `4xx` (the HTTP client already retries network errors and `5xx`).
- Mutations don't retry.
- Returning to the app refetches what's on screen.

## navigation/

**RootNavigator.tsx:** one native stack, static configuration ([M2](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions), [M6](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)). Each group exists only for its [session status](../auth/README.md#session-status):

| Group | Status | Screens |
|---|---|---|
| SignedOut | `signedOut` | SignIn, SignUp, VerifyCode, ForgotPassword, ResetCode, NewPassword |
| Unreachable | `unreachable` | Unreachable |
| SignedIn | `signedIn` | Tabs; QuickAdd (form sheet) |

Params carry ids only; route types come from the config (`RootStackParamList`), so `navigation.navigate(...)` is type-checked.

**tabs.tsx:** the bottom tabs: Today · Upcoming · + · Browse · Search ([M11](../../../tasky-docs/design/clients/apps/06-mobile.md#decisions)). The + is a stand-in `Add` tab that opens QuickAdd instead of switching tabs; `addButtonStyle` picks the filled circle or the plain outlined +.

---

↑ [Structure](README.md) · Next: [core](core.md) →
