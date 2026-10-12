[Tasky mobile](../README.md) › Publishing

# Publishing: first-time setup

What to set up once so an Expo app reaches testers on iOS (TestFlight) and Android (Play internal testing). Written
for Tasky, general enough for the next app: Tasky's values are the examples. After this, each release is the routine
in [Releases](releases.md).

Prices and review times are approximate (2026): check them when you sign up.

## Contents

1. [Accounts](#1-accounts)
2. [Tools on the Mac](#2-tools-on-the-mac)
3. [The app's identity](#3-the-apps-identity)
4. [Link the project to Expo](#4-link-the-project-to-expo)
5. [iOS: the first build to TestFlight](#5-ios-the-first-build-to-testflight)
6. [Android: the first build to internal testing](#6-android-the-first-build-to-internal-testing)
7. [Checklist for the next app](#7-checklist-for-the-next-app)

## 1. Accounts

Open all three once; every later app reuses them. Apple is the slow one: start it first.

| Account | For | Cost | Wait |
|---|---|---|---|
| [Apple Developer Program](https://developer.apple.com/programs/) | Signing iOS builds, App Store Connect, TestFlight | USD 99 a year | Up to 48 hours as an individual; longer for a company (needs a D-U-N-S number) |
| [Google Play Console](https://play.google.com/console) | Play listings, internal testing, the store | USD 25 once | An identity check, a few days |
| [Expo](https://expo.dev) | EAS: builds, signing keys, build numbers, submit | Free plan: a monthly allowance of cloud builds, slower queue | None |

- Turn on two-factor sign-in on each.
- Apple: enroll as an individual unless the app ships under a company name; the seller name in the App Store comes from
  this.
- Google, personal accounts: before an app reaches the public store, Google requires a closed test with a minimum
  number of testers over two weeks. Internal testing has no such rule.

## 2. Tools on the Mac

iOS builds run in Expo's cloud, so they don't need Xcode. Android builds run on the Mac (free), so they need Java and
the Android SDK.

| Tool | For | Install | Check |
|---|---|---|---|
| Node LTS | Expo, npm | `nvm install --lts` | `node -v` |
| EAS CLI | Builds, keys, submit | `npm install -g eas-cli` | `eas --version` |
| Java 17 | Local Android builds | `brew install --cask zulu@17` | `java -version` |
| Android SDK | Local Android builds | Android Studio › SDK Manager | `echo $ANDROID_HOME` |
| Xcode | The iOS simulator only | App Store | `xcrun simctl list` |
| Expo Go | Day-to-day testing on a phone | App Store, Play Store | Scan the QR code of `npx expo start` |

In `~/.zshrc`, then open a new terminal:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## 3. The app's identity

Decide before the first build: once a build is uploaded, Apple and Google tie the app to its bundle id forever.

| Setting | Rule | Azignia | Later |
|---|---|---|---|
| Bundle id (iOS), package (Android) | A reverse domain you own, lowercase, the same on both: `com.<company>.<app>` | `com.ikobit.azignia` | Never: a new id is a new app |
| Name under the icon | Short; the store name can be longer | Azignia | With a new build |
| Version | Semver from `0.1.0`, only in `app.json` | `0.1.0` | Each release |
| Build number | Left to EAS (step 4) | — | Goes up by itself |
| Icon | 1024×1024 PNG, no transparency on iOS; an adaptive icon foreground on Android | `src/assets/images/` | With a new build |
| Encryption (iOS) | `ITSAppUsesNonExemptEncryption: false` when the app only uses HTTPS | `false` | Any time |

```json
{
  "expo": {
    "name": "Azignia",
    "slug": "azignia",
    "version": "0.1.0",
    "ios": {
      "bundleIdentifier": "com.ikobit.azignia",
      "infoPlist": { "ITSAppUsesNonExemptEncryption": false }
    },
    "android": { "package": "com.ikobit.azignia" }
  }
}
```

- No `version` in `package.json` (`"private": true` doesn't need one): the version lives in one place.
- `ios/` and `android/` in `.gitignore`: builds generate them from `app.json` and `app.config.ts` (`expo prebuild`).

## 4. Link the project to Expo

1. `eas login` (check with `eas whoami`).
2. In the app's folder: `eas init`. It creates the project on expo.dev and writes `extra.eas.projectId` into
   `app.json`. Commit it.
3. `eas.json` (Tasky's is in the repo):

```json
{
  "cli": { "version": ">= 18.0.0", "appVersionSource": "remote" },
  "build": {
    "production": {
      "autoIncrement": true,
      "env": { "EXPO_PUBLIC_API_URL": "https://api.example.com/api/v1" }
    },
    "production-apk": { "extends": "production", "android": { "buildType": "apk" } }
  },
  "submit": { "production": {} }
}
```

| Key | Does |
|---|---|
| `appVersionSource: remote` | EAS keeps the build numbers (iOS `buildNumber`, Android `versionCode`), not `app.json` |
| `autoIncrement` | Each build takes the next number |
| `env.EXPO_PUBLIC_API_URL` | The API the build calls. Not a secret; changing it needs a new build. Tasky's builds refuse to start without it |
| `production-apk` | The same build as an `.apk`, to install directly on a phone |

Day to day, keep using Expo Go: no build, and `.env.local` (`EXPO_PUBLIC_API_URL=…`) points it at any API.

## 5. iOS: the first build to TestFlight

EAS builds and signs iOS in the cloud; the first build creates the certificate and profile from your Apple account.

1. **Create the app.** [App Store Connect](https://appstoreconnect.apple.com) › Apps › + › New App: iOS, the name
   (unique in the App Store; add a word if taken), the language, bundle id `com.ikobit.azignia` (not listed? add it in
   Certificates, Identifiers & Profiles › Identifiers), an SKU (any code, e.g. `azignia`).
2. **Build:** `npm run build:ios` (`eas build --platform ios --profile production`). The first time it asks:
    1. to sign in with your Apple ID (a code on your phone);
    2. to create a distribution certificate and a provisioning profile: yes to both. EAS keeps them.
3. **Send it:** `npm run submit:ios` (`eas submit --platform ios --latest`). The first time it creates an App Store
   Connect API key: yes. Apple processes the build in about 10–30 minutes and emails you.
4. **Testers.** App Store Connect › the app › TestFlight:
    - **Internal testing:** people in your App Store Connect team (up to 100); a group, no review.
    - **External testing:** anyone, by email or a public link; the first build of each version needs a short Beta App
      Review (about a day) and the Test Information filled in.
5. Testers install **TestFlight**, accept the invitation and install the app. New builds show up there.

## 6. Android: the first build to internal testing

Android builds on the Mac with `eas build --local`; EAS still keeps the signing key and the build number. Google
requires the first upload of a new app by hand.

1. **Create the app.** [Play Console](https://play.google.com/console) › Create app: the name, the language, App, Free,
   the declarations. The first upload sets the package.
2. **Build:** `npm run build:android` (`eas build --platform android --profile production --local`), output in
   `builds/`. The first time it asks to generate a keystore: yes. EAS keeps it and hands it to each local build.
3. **Back up the key now:** `eas credentials` › Android › production › Download keystore. The `.jks` file and its
   passwords go in your password manager, never in git.
4. **Upload.** Play Console › the app › Test and release › Testing › **Internal testing**:
    1. Testers: create an email list with the testers' Google accounts (up to 100).
    2. Create new release: accept **Play App Signing** (Google signs what users get; yours is only the upload key,
       which Google can reset if lost), upload the `.aab`, name it with the version, paste its CHANGELOG section as the
       notes.
    3. Review release › Start rollout.
5. **Testers:** send them the opt-in link (Testers tab); they accept on the web, then install from the Play Store.
6. Play Console asks for the **App content** forms (privacy policy URL, ads, data safety, target audience). Internal
   testing lets some wait; the store doesn't.

An `.apk` to install directly: `npm run build:android -- apk`.

## 7. Checklist for the next app

- [ ] Once: the Apple, Google Play and Expo accounts ([1](#1-accounts))
- [ ] Once: Node, `eas-cli`, Java 17, the Android SDK, `ANDROID_HOME` ([2](#2-tools-on-the-mac))
- [ ] Bundle id, name, icon, version `0.1.0` in `app.json`; `ios/` and `android/` ignored ([3](#3-the-apps-identity))
- [ ] `eas init`; `eas.json` with `appVersionSource: remote` and `autoIncrement` ([4](#4-link-the-project-to-expo))
- [ ] The API's URL for builds in `eas.json` ([4](#4-link-the-project-to-expo))
- [ ] App Store Connect app, first iOS build, submit, a TestFlight group ([5](#5-ios-the-first-build-to-testflight))
- [ ] Play Console app, first Android build, keystore backed up, first `.aab` by hand, testers ([6](#6-android-the-first-build-to-internal-testing))
- [ ] The first release tagged: `scripts/release.sh 0.1.0` ([Releases](releases.md))
