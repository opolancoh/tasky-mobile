# Tasky mobile

The Tasky app for iOS and Android: Expo (React Native) and TypeScript. v1 is online-only, with email + password sign-in.

## Contents

- [Run](#run)
- [Check](#check)
- [Configuration](#configuration)
- [Stack](#stack)
- [Documentation](#documentation)
- [Status](#status)

## Run

Needs Node LTS and `tasky-api` running on this Mac (port 5186).

```bash
npm install
npm run ios        # or: npm run android, npm start (then scan the QR code with Expo Go)
```

The simulator, an emulator and a phone on the same Wi-Fi reach the API with no setup (see [Configuration](#configuration)).

## Check

Run before every commit:

```bash
npm run check              # TypeScript + ESLint, including the folder import rules and no hard-coded colors
npx expo install --check   # package versions match the Expo SDK
```

## Configuration

| Setting | Default | Change it |
|---|---|---|
| API address | In development, the Mac that runs Metro, port 5186 (`/api/v1`) | `EXPO_PUBLIC_API_URL` in `.env.local` (copy `.env.example`), to reach an API somewhere else |
| Palette | Azure | `src/shared/ui/palettes/active.json` |

The API must listen on all interfaces for phones to reach it: `tasky-api`'s launch profile uses `http://*:5186`.

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

Why each: [06-mobile.md › Stack](../tasky-docs/design/clients/apps/06-mobile.md#stack) and its [decision log](../tasky-docs/design/clients/apps/06-mobile.md#decisions).

## Documentation

| Doc | Covers |
|---|---|
| [Auth](docs/auth/README.md) | [Launch](docs/auth/launch.md), [Sign in](docs/auth/sign-in.md), [Sign up](docs/auth/sign-up.md), [Password reset](docs/auth/password-reset.md), [Tokens and invalid tokens](docs/auth/tokens.md), [Sign out](docs/auth/sign-out.md) |
| [Structure](docs/structure/README.md) | Folders, layers, import rules, naming: [app](docs/structure/app.md), [core](docs/structure/core.md), [data](docs/structure/data.md), [features](docs/structure/features.md), [shared](docs/structure/shared.md) |
| [06-mobile.md](../tasky-docs/design/clients/apps/06-mobile.md) | The spec: stack, navigation, data, session, UI rules, decisions |
| [Design hub](https://claude.ai/artifact/MM37Pcm1VePn7oFGFeumhh) | Every screen's design, by area (source in `artifacts/tasky/`) |

## Status

| Area | State |
|---|---|
| Auth | Built: sign in, sign up with a code, password reset, session kept across restarts and bad connections |
| Tabs | Today · Upcoming · + · Browse · Search; Today shows the date, the others are shells |
| Quick add | The sheet opens from the +; the form comes with its design (options in the hub) |
| Next | Account settings, Today's tasks, Quick add, Task detail |
