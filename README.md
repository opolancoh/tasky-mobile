# Tasky mobile

Expo (React Native, TypeScript) app for Tasky. v1 is online-only with email + password sign-in.

Spec: [`tasky-docs/design/clients/apps/06-mobile.md`](../tasky-docs/design/clients/apps/06-mobile.md) (stack, folders, import rules, navigation, data, session). Look: the Calm ocean direction of the [prototype](https://claude.ai/artifact/MM37Pcm1VePn7oFGFeumhh).

## Run

Needs Node LTS and `tasky-api` running (`http://localhost:5186`).

```bash
npm install
npm run ios        # or: npm run android, npm start
```

Another API address: copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_API_URL` (Android emulator: `http://10.0.2.2:5186/api/v1`).

## Check

```bash
npm run check      # TypeScript + ESLint, including the folder import rules
npx expo install --check   # package versions match the Expo SDK
```

## Layout

| Folder | Holds |
|---|---|
| `src/app` | Startup, providers, navigation, service wiring |
| `src/core` | Plain TypeScript: HTTP client, tokens, dates. No React or Expo |
| `src/data` | One folder per API module: endpoints, types, query keys and hooks |
| `src/features` | One folder per product area: screens and their parts |
| `src/shared` | Design system (`ui`), session, i18n, shared components |
