[Azignia mobile](../README.md) › Releases

# Releases

How the app is versioned, released and built for testers (TestFlight on iOS, Play internal testing on Android). Same
flow as the API's ([azignia-api/docs/releases.md](../../azignia-api/docs/releases.md)); the reasons are in
[06-mobile.md](../../azignia-docs/design/clients/apps/06-mobile.md#decisions) (M46–M49).

## Contents

- [What a release is](#what-a-release-is)
- [The release script](#the-release-script)
- [Building for testers](#building-for-testers)
- [Signing](#signing)
- [One-time setup](#one-time-setup)
- [Not yet](#not-yet)

## What a release is

A tested commit on `main` that you call a version, e.g. **0.2.0**: the version is `expo.version` in `app.json`, a git
tag (`v0.2.0`) marks it, and `CHANGELOG.md` says what changed. Releasing and building are separate: you release once,
then build it for each platform (and build again if a build fails).

| Number | Example | Where it lives | Changes |
|---|---|---|---|
| **Version** | `0.2.0` ([semver](https://semver.org), from `0.1.0`) | `app.json` only; only the script changes it | Every release |
| **Build** | iOS `buildNumber`, e.g. `14` | EAS, on Expo's servers (`appVersionSource: remote`) | Every iOS build, by itself (`autoIncrement`) |
| **versionCode** | Android, from the version: `0.3.1` → `301` | `app.config.ts` (y and z up to 99) | Every release; rebuilding a version gives the same code (M61) |

| Where | Shows |
|---|---|
| Me › About | `0.2.0 (14)`, or `0.2.0 (Expo Go)`; and the API's version (`GET /api/version`) and address |
| `X-Client` on every request | `ios/0.2.0`, `android/0.2.0`: the API answers `426` when it's below a minimum, and the app asks to update |
| TestFlight, Play Console | `0.2.0 (14)` |
| Git | the tag `v0.2.0` |

## The release script

```bash
scripts/release.sh 0.3.0    # the version you want
scripts/release.sh minor    # 0.2.0 → 0.3.0: new features
scripts/release.sh patch    # 0.3.0 → 0.3.1: fixes only
scripts/release.sh major    # 0.3.1 → 1.0.0: 1.0 for the stores, or a big change
```

(`npm run release -- minor` works too.) From `azignia-mobile`, it:

1. Checks you're on `main` with nothing uncommitted, and that `npm run check` passes.
2. Sets the next version in `app.json`.
3. Adds a section to the top of `CHANGELOG.md` with the commit messages since the last tag (the first release just
   says "First release.").
4. **Waits while you review it:** edit `CHANGELOG.md` in any editor, save, press Enter (`n`, Ctrl+C or Ctrl+D cancels and puts everything
   back).
5. Shows the section as you left it, asks once more, then commits `Release x.y.z` and tags `vx.y.z`.
6. Prints how to push and publish. Nothing leaves your machine, and nothing is built: that's [Building for testers](#building-for-testers).

### Example

```
$ scripts/release.sh 0.2.0
Checking...

Release 0.2.0 (was 0.1.0) is ready to review: CHANGELOG.md has a new section at the top.
Edit it in any editor if you want (reword, add notes), save, then come back here.
Enter to continue, n to cancel:

Release 0.2.0:
- Assign one task to someone outside its list.
- About in Me shows the app's and the API's versions.
Commit and tag v0.2.0? [Y/n]
Tagged v0.2.0 (local only).

When you want it on GitHub:
  git push && git push origin v0.2.0
Then, for a GitHub Release, paste this section of CHANGELOG.md at:
  https://github.com/opolancoh/tasky-mobile/releases/new?tag=v0.2.0
```

Then build it for testers ([Building for testers](#building-for-testers)).

### When it stops

| Message | Do |
|---|---|
| `Release from main` | Merge into `main` first |
| `Commit or stash your changes first` | Commit them (they belong in the release) or stash them |
| `vX already exists` | Pick another version |
| `Nothing to release since vX` | Nothing to do |
| `npm run check` fails | Fix it and commit |

To undo a release before pushing: `git tag -d vX` and `git reset --hard HEAD~1`. After pushing, release a new patch.

## Building for testers

Day to day, the app runs in **Expo Go** (no build): `npm run ios`, or the QR code on a phone, against the API on this
Mac or any other, set in `.env.local` (`EXPO_PUBLIC_API_URL`, required). A build is only for testers.

```bash
npm run build:ios               # EAS, in Expo's cloud (iOS signing is the hard part; EAS does it)
npm run submit:ios              # the latest iOS build → TestFlight
npm run build:android           # Gradle on this Mac (no EAS): builds/azignia-<version>-<versionCode>.aab
npm run build:android -- apk    # an .apk to install directly on a phone
```

`build:ios` is EAS directly. `build:android` is `scripts/android-build.sh`, which **builds only a release commit**:

| On | It |
|---|---|
| Uncommitted changes | Stops (it never commits): commit them, then release (`npm run release -- patch\|minor\|major`) |
| A clean commit that isn't a release | Offers to cut one: type `patch`, `minor`, `major` or a version, and it runs `scripts/release.sh` (the same review and prompts), then builds; Enter stops |
| The release commit (tagged `v<version>` from `app.json`) | Checks the build's API address, the Android SDK (`ANDROID_HOME`, or `~/Library/Android/sdk`), Java and the upload key (`keystore.properties`, its SHA-1 read with `keytool`). Shows a summary (version, release date and commit, versionCode, package, API, signing key and SHA-1, output file, and the version's CHANGELOG section) and asks **Build it?**. Then `expo prebuild --clean` (android/, signed by `plugins/withReleaseSigning.js`), Gradle (`bundleRelease` or `assembleRelease`), and copies the result to `builds/`, printing its full path, size and what to do next. `.env` files are ignored: only the build's settings reach it |

Then:

- **iOS:** `npm run submit:ios`, then in App Store Connect › TestFlight add the build to the testers' group.
- **Android:** Play Console › Azignia › Test and release › Testing › **Internal testing** › Create new release, upload
  the `.aab`, paste the version's `CHANGELOG.md` section as release notes, Review release, Roll out.

**The build's API address** ([where each API address is set](../README.md#the-api-address)) is `EXPO_PUBLIC_API_URL` in `eas.json` (`build.production.env`), e.g.
`http://192.168.1.50:5186/api/v1` (a Raspberry Pi at home) or `https://api.example.com/api/v1`. It's not a secret.
Builds refuse to start without it. An `http://` address also allows plain HTTP in that build (`app.config.ts`); an
`https://` one doesn't. The same address goes to iOS and Android.

Changing it: edit `eas.json`, commit, build and submit both platforms; installed copies keep the old address until
testers update. Moving the API to another server needs no build: point `api.azignia.com` (DNS or the tunnel) at it.

Native folders: a build runs `expo prebuild`, which writes `ios/` and `android/` from `app.json` and `app.config.ts`.
They're generated and kept out of git; native settings go in `app.json` / `app.config.ts`, never in those folders.

## Signing

Every build is signed, never with a key in this repo (`.gitignore` covers `keystore.properties`, `credentials.json`,
`*.keystore`, `*.jks`, `*.p12`, `*.p8`, `*.mobileprovision`, `/builds`). iOS keys stay with **EAS**; Android's upload key
is a file on this Mac.

| Platform | Key | Where | Backup |
|---|---|---|---|
| Android | Upload keystore (Google re-signs with its own key: Play App Signing) | A `.jks` on this Mac, named in `keystore.properties` (see below) | The `.jks` and its passwords in your password manager. If lost, Play Console › App integrity can reset the upload key |
| iOS | Distribution certificate and provisioning profile | EAS, created from your Apple account on the first build | None needed: EAS can make new ones from the Apple account |
| iOS submit | App Store Connect API key | EAS, created on the first `submit:ios` | None needed |

**Creating the Android upload key** (once; then back it up):

```bash
keytool -genkeypair -v -keystore ~/keys/azignia-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

Then `keystore.properties` next to `app.json` (gitignored):

```properties
storeFile=/Users/you/keys/azignia-upload.jks
storePassword=…
keyAlias=upload
keyPassword=…
```

`storeFile` can also be relative to `azignia-mobile`. `scripts/android-build.sh` checks the file, the key and its
passwords before anything else, and shows the key's SHA-1, which Play Console lists under App integrity › Upload key.

## One-time setup

Accounts, tools, `eas init`, the first build on each platform, App Store Connect and Play Console: [Publishing](publishing.md).

## Not yet

- **Publishing in the stores**, beyond TestFlight and internal testing ([pending decisions](../../azignia-docs/design/pending-decisions.md#apps)).
- **Updates without a store build** (OTA, `expo-updates`): after the first test builds (M49).
- **The API's minimum version:** the app handles `426`, but the API doesn't check `X-Client` against a minimum yet
  ([pending decisions](../../azignia-docs/design/pending-decisions.md#apps)).
