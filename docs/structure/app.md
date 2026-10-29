[Azignia mobile](../../README.md) › [Structure](README.md) › app

# `src/app`

Startup and wiring only. The one layer that may import everything; nothing imports it.

```
src/app/
├── App.tsx              Providers, fonts, splash, navigation theme
├── config.ts            EXPO_PUBLIC_* settings: the API address, the development HTTP log level
├── services.ts          The single HTTP client and token manager, wired to Expo
├── queryClient.ts       TanStack Query defaults
├── LinkWatcher.tsx      Join links (azignia://join, azignia://i, D95, M84): kept through sign-in, then opened as Join; navigationRef
├── PushWatcher.tsx      Push (D97, M85, M88): registers the token, refreshes on a push (its task's detail and comments too), the icon's badge, opens a tapped push (task kinds at once, the others as its Activity row) or reminder, asks after mutations that make it worth it
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
| `ErrorBoundary` | A render error (or a fatal one from the global handler) is saved as an error report and Something went wrong takes the app's place, with Restart and View report ([M89](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)) |
| `QueryClientProvider` | The server-data cache |
| `SessionProvider` | `useSession()`: sign in, sign out, retry; runs the [launch](../auth/launch.md) and retries a sign-out made offline (M88) |

Before rendering, `installErrorCapture()` sets the global error handler and the unhandled-rejection tracker (M89). Navigation's `onReady`/`onStateChange` add each screen to the error reports' breadcrumbs.

`Root` loads the Figtree fonts, keeps the splash up until the fonts are loaded and the session is checked, builds React Navigation's theme from the palette, and renders `Navigation`. While signed in it also mounts the +'s menu (`AddMenu`, given New list and New team, which go to what was created) and the Quick add sheet once, above every screen.

## config.ts

The only place that reads `EXPO_PUBLIC_*` (set in `.env.local` in development, `eas.json` for builds). `apiUrl`: `EXPO_PUBLIC_API_URL`, **required** everywhere so it's always known which API the app calls; `app.config.ts` stops `npx expo start` and `eas build` without it, and prints the settings when Metro starts (`Config OK`, then one line per setting). `httpLog`: optional, `all` by default.

## services.ts

Created once at startup:

| Instance | Wiring |
|---|---|
| `httpClient` | The API address, 15-second timeout, headers on every request (`X-Client: ios/1.0.0`, `X-Device-Name`, `Accept-Language`), UUIDv7s (`core/ids.ts`, from expo-crypto) for `Idempotency-Key` and ids the app gives what it creates |
| `tokenStore` | Secure storage (`expo-secure-store`), key `azignia.tokens` |
| `tokenManager` | The store, `POST /auth/refresh`, and what a refused session does: clear the query cache and set the status to `signedOut` |

`configureHttp(httpClient)` hands the client to `src/data`; `httpClient.setAuth(tokenManager)` adds the token to signed-in requests. The client's log also feeds the error reports' breadcrumbs (`breadcrumbRecorder`), and `configureErrorReports` gives them the endpoint and `tokenManager.peekAccessToken()` (never a refresh, M89).

## queryClient.ts

- Data is fresh for 30 seconds.
- A failed query retries once, but never for a `4xx` (the HTTP client already retries network errors and `5xx`).
- Mutations don't retry.
- Returning to the app refetches what's on screen.
- **Can't connect (M90):** a mutation that couldn't reach Azignia (`isConnectionError`) becomes what the capsule's Try again repeats (`mutation.execute`); `toastError` and `meta.toastError` show the capsule, and so does a retried mutation failing again. A query refresh that fails with data on screen shows the capsule with a refetch; with nothing on screen the screen shows `LoadError`.

## navigation/

**RootNavigator.tsx:** one native stack, static configuration ([M2](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions), [M6](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)). Each group exists only for its [session status](../auth/README.md#session-status):

| Group | Status | Screens |
|---|---|---|
| SignedOut | `signedOut` | SignIn, SignUp, VerifyCode, ForgotPassword, ResetCode, NewPassword |
| Unreachable | `unreachable` | Unreachable |
| SignedIn | `signedIn` | Tabs |

Params carry ids only; route types come from the config (`RootStackParamList`), so `navigation.navigate(...)` is type-checked.

**tabs.tsx:** the bottom tabs: Home · Spaces · + · Calendar · Search (routes Today and Browse, M65, M70; [M11](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions), [M39](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions), [M74](../../../azignia-docs/design/clients/apps/06-mobile.md#decisions)). Activity is a pushed screen, opened from Home's bell (`ActivityBell`, with the unread count). The + is a stand-in `Add` tab that opens its menu (`useQuickAdd().showMenu()`: Task, List, Team, M113) instead of switching tabs; `addButtonStyle` picks the filled circle or the plain outlined +.

---

↑ [Structure](README.md) · Next: [core](core.md) →
