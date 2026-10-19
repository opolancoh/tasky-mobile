[Azignia mobile](../README.md) › Push setup

# Push setup

One-time setup so an Expo app can receive push notifications on Android and iOS, through **Expo's push service**
(decided in [Proposed Features #6](../../azignia-docs/design/proposed-features.md#6-push-notifications-and-following)).
Written as a checklist that works for any Expo app: replace the names in the table.

| This app | Value |
|---|---|
| Package / bundle id | `com.ikobit.azignia` |
| Firebase project | Azignia, id `azignia-4f2a4` (Spark plan, free) |
| Expo project | `azignia` (EAS), profile `production` |

## Contents

- [How it fits](#how-it-fits)
- [What it costs](#what-it-costs)
- [Android: Firebase](#android-firebase)
- [Android: the key in EAS](#android-the-key-in-eas)
- [iOS: the APNs key](#ios-the-apns-key)
- [The app](#the-app)
- [Where each secret lives](#where-each-secret-lives)
- [Checking it works](#checking-it-works)

## How it fits

```
API ──▶ Expo push service ──▶ FCM (Google) ──▶ Android phone
                          └─▶ APNs (Apple) ──▶ iPhone
```

Apple and Google are the only ways to wake a phone; Expo sits in front of both, so the API sends one request per
device whatever the platform. Expo needs each platform's credentials to do it: **FCM V1** (a Firebase service-account
key) for Android, an **APNs key** for iOS. Both are stored in EAS, never in the repo. Going straight to FCM and APNs
later only changes the API's sender and the token the app registers (`getDevicePushTokenAsync`).

Local notifications (reminders, M42) need none of this.

## What it costs

Nothing extra: Expo's push service, FCM and APNs are free. APNs needs the Apple Developer Program, already paid for
TestFlight. Expo's limit is 600 notifications a second per project.

## Android: Firebase

FCM is part of Firebase, so Android needs a Firebase project even though the app uses no Firebase SDK.

1. [console.firebase.google.com](https://console.firebase.google.com), signed in with the Google account that should
   own the app (not a client's or employer's) → **Create a new Firebase project**.
2. Name it (the app's name). The project id gets a random suffix (`azignia-4f2a4`): fine, nobody sees it, and it
   can't change later. Skip Gemini; **Google Analytics off** → Create.
3. **+ Add app → Android** → package name exactly as in `app.json` (`com.ikobit.azignia`); nickname optional; no
   SHA-1 → **Register app**.
4. **Download `google-services.json`** and put it at the project root (`azignia-mobile/google-services.json`). It
   identifies the app to FCM and isn't secret, so it's committed.
5. Skip "Add Firebase SDK" (Gradle plugins): Expo's prebuild adds the Google services plugin from
   `android.googleServicesFile`. Next → **Continue to console**.
6. **Settings (gear) › Service accounts › Firebase Admin SDK → Generate new private key**. It downloads
   `<project>-firebase-adminsdk-….json`: a **secret**. Ignore the Admin SDK code snippet.

One Firebase project while there's one build; a second when a separate dev or QA build (another package name) exists.

## Android: the key in EAS

```bash
eas credentials
```

**Android → production → Google Service Account → Manage your Google Service Account Key for Push Notifications
(FCM V1) → Set up a Google Service Account Key for Push Notifications (FCM V1)**, and give the path of the key from
step 6. It ends with "Google Service Account Key assigned to com.ikobit.azignia for FCM V1".

Then delete the key from Downloads (`rm ~/Downloads/<project>-firebase-adminsdk-….json`). A new one can be generated
any time; old ones can be deleted in Google Cloud › IAM › Service accounts.

Left empty on purpose: *Push Notifications (FCM Legacy)* (retired by Google), *Submissions* (Android builds go to
Play by hand, [Releases](releases.md)), and the build credentials (Android builds are signed with our own upload key,
M61).

## iOS: the APNs key

No Firebase. EAS makes the key the first time an iOS build asks:

```bash
eas build -p ios
```

Answer **yes** to "set up Push Notifications for your project?" and let it generate the key with your Apple account.
To see or replace it later: `eas credentials` → iOS → production → Push Notifications. One APNs key (`.p8`) works for
every app in the Apple team; Apple allows two at a time.

## The app

Built (M85): `docs/structure/shared.md › notifications`, `src/app/PushWatcher.tsx`.

- `app.json`: `android.googleServicesFile: "./google-services.json"`; `expo-notifications` in `plugins`; the EAS project
  id in `extra.eas.projectId` (`getExpoPushTokenAsync({ projectId })` needs it).
- Asks for permission at a useful moment (our sheet first), registers the Expo push token with the API
  (`PUT /me/devices/{installId}`), removes it on sign-out (`DELETE`).
- **Expo Go** can't receive push on Android (SDK 53+): the app skips registering there. Test on a TestFlight build and
  an Android release build ([Releases](releases.md#building-for-testers)); a change to `app.json` or the native config
  needs a new build.

## Where each secret lives

| What | Where | In git |
|---|---|---|
| `google-services.json` | `azignia-mobile/` | Yes (not secret) |
| FCM V1 service-account key | EAS (Android credentials) | No; deleted from the Mac after uploading |
| APNs key (`.p8`) | EAS (iOS credentials), made by EAS | No |
| Expo access token for the API (only if push security is turned on in Expo) | The API's secrets (`AZIGNIA_…`) | No |

## Checking it works

1. Install a TestFlight or Android release build and allow notifications.
2. Copy the device's Expo push token (Me › About shows it in test builds).
3. [expo.dev/notifications](https://expo.dev/notifications): paste the token, a title and a body → Send.
4. No push: check `eas credentials` (the key is assigned to the right package or bundle id), that the build was made
   after the key was added, and the receipt in Expo's tool (`DeviceNotRegistered` means the token is stale).
