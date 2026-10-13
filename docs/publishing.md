[Azignia mobile](../README.md) › Publishing

# Publishing: first-time setup

How to get an Expo app to testers the first time: TestFlight on iOS, internal testing on Google Play. Azignia's values
are the examples. Every later release: [Releases](releases.md).

## Contents

1. [Accounts](#1-accounts)
2. [Tools to build and send](#2-tools-to-build-and-send)
3. [The app's identity](#3-the-apps-identity)
4. [Link the project to Expo](#4-link-the-project-to-expo)
5. [iOS: the first build to TestFlight](#5-ios-the-first-build-to-testflight)
6. [Android: the first build to internal testing](#6-android-the-first-build-to-internal-testing)
7. [Checklist](#7-checklist)

## 1. Accounts

You need these three accounts, once for all your apps.

| Account | For | Cost |
|---|---|---|
| [Apple Developer Program](https://developer.apple.com/programs/) | Signing iOS builds, App Store Connect, TestFlight | USD 99 a year (approval up to 48 hours) |
| [Google Play Console](https://play.google.com/console) | Internal testing and the Play Store | USD 25 once (identity check, a few days) |
| [Expo](https://expo.dev) | EAS: builds, signing keys, build numbers, submit | Free |

Before the first upload, the only thing that can block you: a pending agreement in App Store Connect (a banner at the
top; accept it) or an unverified identity in Play Console (a warning on Home).

## 2. Tools to build and send

iOS builds run in Expo's cloud: only EAS CLI is needed. Android builds run on the Mac (free): they also need Java and
the Android SDK.

| Tool | For | Install |
|---|---|---|
| EAS CLI | Every build and submit | `npm install -g eas-cli` |
| Java 17 | Android builds | `brew install --cask zulu@17` |
| Android SDK | Android builds | Android Studio › SDK Manager, then `export ANDROID_HOME=$HOME/Library/Android/sdk` in `~/.zshrc` |

## 3. The app's identity

Set in `app.json` before the first build. The bundle id can never change: Apple and Google tie the app to it.

| Setting | Rule | Azignia |
|---|---|---|
| Bundle id (iOS), package (Android) | A reverse domain you own, lowercase, the same on both | `com.ikobit.azignia` |
| Name under the icon | Short; the store name can be longer | Azignia |
| Version | Semver from `0.1.0` | `0.1.0` |
| Icon | 1024×1024 PNG, no transparency on iOS; an adaptive icon on Android | `src/assets/images/` |
| Encryption (iOS) | `ITSAppUsesNonExemptEncryption: false` when the app only uses HTTPS; without it, every upload asks | `false` |

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

## 4. Link the project to Expo

1. `eas login`, with the account (personal or an organization) that should own the app.
2. In the app's folder: `eas init`. It creates the project on expo.dev and writes `extra.eas.projectId` into
   `app.json`. Commit it.
3. In `eas.json` (in the repo), set the API the builds call: `EXPO_PUBLIC_API_URL`. Builds refuse to start without
   it; changing it needs a new build. Leave the key out until you know it: EAS rejects an empty value.

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

`appVersionSource: remote` and `autoIncrement`: EAS keeps the build number (iOS `buildNumber`, Android `versionCode`)
and raises it on every build; the stores reject a number they've seen.

## 5. iOS: the first build to TestFlight

EAS builds and signs iOS in the cloud; the first build creates the certificate and profile from your Apple account.

1. **Create the app.** [App Store Connect](https://appstoreconnect.apple.com) › Apps › + › New App: iOS, the name
   (unique in the App Store; add a word if taken), the language, bundle id `com.ikobit.azignia`, an SKU (any code, e.g.
   `azignia`), User Access: Full Access. The bundle id isn't listed until it's registered: Certificates, Identifiers &
   Profiles › Identifiers › + › App IDs › App, Explicit, no capabilities (EAS turns on what the app uses); or run the
   first build, which registers it.
2. **Build:** `npm run build:ios`. The first time it asks:
    1. to sign in with your Apple ID (a code on your phone);
    2. to create a distribution certificate and a provisioning profile: yes to both. EAS keeps them.
3. **Send it:** `npm run submit:ios`. The first time it creates an App Store Connect API key: yes. Apple processes
   the build in about 10–30 minutes and emails you.
4. **Testers.** App Store Connect › the app › TestFlight:
    - **Internal testing:** people in your App Store Connect team (up to 100); a group, no review. `eas submit`
      creates one, **Team (Expo)**, with only you. Add testers with the group's +; a user is listed only if Users
      and Access › the user › Apps includes this app (or All Apps).
    - **External testing:** anyone, by email or a public link; the first build of each version needs a short Beta App
      Review (about a day) and the Test Information filled in.
5. Testers install **TestFlight**, accept the invitation and install the app. New builds show up there.

## 6. Android: the first build to internal testing

EAS keeps the signing key and the build number; the build runs on the Mac. Google requires the first upload of a new
app by hand.

1. **Create the app.** [Play Console](https://play.google.com/console) › Create app: the name, the language, App, Free,
   the declarations. The first upload sets the package.
2. **Build:** `npm run build:android` (an `.aab` in `builds/`). The first time it asks to generate a keystore: yes.
3. **Back up the key now:** `eas credentials` › Android › production › Download keystore. The `.jks` file and its
   passwords go in your password manager, never in git.
4. **Upload.** Play Console › the app › Test and release › Testing › **Internal testing**:
    1. Testers: an email list with the testers' Google accounts (up to 100).
    2. Create new release: accept **Play App Signing** (Google signs what users get; yours is only the upload key,
       which Google can reset if lost), upload the `.aab`, name it with the version, add release notes.
    3. Review release › Start rollout.
5. **Testers:** send them the opt-in link (Testers tab); they accept on the web, then install from the Play Store.
6. Play Console asks for the **App content** forms (privacy policy URL, ads, data safety, target audience). Internal
   testing lets some wait; the store doesn't.

## 7. Checklist

- [ ] Apple, Google Play and Expo accounts; no pending agreement or verification ([1](#1-accounts))
- [ ] EAS CLI; Java 17 and the Android SDK ([2](#2-tools-to-build-and-send))
- [ ] Bundle id, name, version, icon, encryption flag in `app.json` ([3](#3-the-apps-identity))
- [ ] `eas init`; the API's URL in `eas.json` ([4](#4-link-the-project-to-expo))
- [ ] App Store Connect app, first iOS build, submit, a TestFlight group ([5](#5-ios-the-first-build-to-testflight))
- [ ] Play Console app, first Android build, keystore backed up, first `.aab` by hand, testers ([6](#6-android-the-first-build-to-internal-testing))
