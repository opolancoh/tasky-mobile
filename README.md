# Azignia mobile

The Azignia app for iOS and Android: Expo (React Native) and TypeScript. v1 is online-only, with email + password sign-in.

## Contents

- [Run](#run)
- [Check](#check)
- [Configuration](#configuration)
- [Stack](#stack)
- [Documentation](#documentation)
- [Status](#status)

## Run

Needs Node LTS and `azignia-api` running on this Mac (port 5186).

```bash
npm install
cp .env.example .env.local   # once: the API address (see Configuration)
npm run ios        # or: npm run android, npm start (then scan the QR code with Expo Go)
```

## Check

Run before every commit:

```bash
npm run check              # TypeScript + ESLint, including the folder import rules and no hard-coded colors
npx expo install --check   # package versions match the Expo SDK
```

## Configuration

### The API address

`EXPO_PUBLIC_API_URL`, required. Set it in one of two places:

| To change the API of | Edit | Then |
|---|---|---|
| **Development** (Expo Go: simulator, emulator, your phone) | `.env.local` (not in git; copy `.env.example`) | Restart `npx expo start` |
| **Builds** (TestFlight and Play, iOS and Android alike) | `eas.json` › `build.production.env` (in git) | Commit, build and submit again ([Releases](docs/releases.md#building-for-testers)) |

Examples: `http://localhost:5186/api/v1` (iOS simulator), `http://<this Mac's IP>:5186/api/v1` (a phone or the
Android emulator; `azignia-api` listens on all interfaces, `http://*:5186`), `https://api.azignia.com/api/v1` (builds).
`npx expo start` and a build stop when it's missing.

### Other settings

| Setting | Default | Change it |
|---|---|---|
| HTTP log in the Metro terminal | `all` | `EXPO_PUBLIC_HTTP_LOG` in `.env.local`: `all`, `errors`, `off` |
| Palette | Azure | `src/shared/ui/palettes/active.json` |

## Stack

| Concern | Choice |
|---|---|
| Framework | Expo (latest SDK), TypeScript strict |
| Navigation | React Navigation: native stack + bottom tabs, static config |
| Server data | TanStack Query |
| App-wide state | Zustand, saved fields in AsyncStorage |
| Tokens | `expo-secure-store` (Keychain / Keystore) |
| Languages | i18next: English and Spanish |
| Design | Calm ocean · HIG in the Azure palette, Figtree |

Why each: [06-mobile.md › Stack](../azignia-docs/design/clients/apps/06-mobile.md#stack) and its [decision log](../azignia-docs/design/clients/apps/06-mobile.md#decisions).

## Documentation

| Doc | Covers |
|---|---|
| [Auth](docs/auth/README.md) | [Launch](docs/auth/launch.md), [Sign in](docs/auth/sign-in.md), [Sign up](docs/auth/sign-up.md), [Password reset](docs/auth/password-reset.md), [Tokens and invalid tokens](docs/auth/tokens.md), [Sign out](docs/auth/sign-out.md) |
| [Releases](docs/releases.md) | Versions, `scripts/release.sh`, builds for TestFlight and Play internal testing, signing |
| [Publishing](docs/publishing.md) | First-time setup: accounts, tools, the app's identity, Expo, the first iOS and Android builds |
| [Push setup](docs/push-setup.md) | One-time setup for push: Firebase (FCM V1) and the APNs key in EAS, where each secret lives, testing a push |
| [Structure](docs/structure/README.md) | Folders, layers, import rules, naming: [app](docs/structure/app.md), [core](docs/structure/core.md), [data](docs/structure/data.md), [features](docs/structure/features.md), [shared](docs/structure/shared.md) |
| [06-mobile.md](../azignia-docs/design/clients/apps/06-mobile.md) | The spec: stack, navigation, data, session, UI rules, decisions |
| [Design hub](https://claude.ai/artifact/MM37Pcm1VePn7oFGFeumhh) | Every screen's design, by area (source in `artifacts/tasky/`) |

## Status

| Area | State |
|---|---|
| Auth | Built: sign in, sign up with a code, password reset, session kept across restarts and bad connections |
| Tabs | Today · Upcoming · + · Browse · Search; Today shows the date, the others are shells |
| Quick add | Built: the new-task form in a sheet from the + (list, priority, tags, due date, reminder with date and time wheels, notes) |
| Next | Today's tasks, Task detail, account settings |
