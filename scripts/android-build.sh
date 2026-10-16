#!/usr/bin/env bash
# Builds a release of the app for Android testers on this Mac, with Gradle (no EAS) (docs/releases.md, M61):
#   scripts/android-build.sh [aab|apk]    aab (default) for Play internal testing; apk to install on a phone
# Only a release commit is built: uncommitted changes stop it; a commit that isn't a release offers to cut one with
# scripts/release.sh, then builds it. It never commits. Signed with the upload key in keystore.properties; versionCode
# comes from the version (app.config.ts). The API address is eas.json's build.production.env.
set -euo pipefail
cd "$(dirname "$0")/.."
root=$(pwd)

type=${1:-aab}
[[ $# -le 1 && ($type == aab || $type == apk) ]] || { echo "Usage: scripts/android-build.sh [aab|apk]" >&2; exit 1; }

# What it needs, checked before anything else.
api=$(node -p 'require("./eas.json").build.production.env?.EXPO_PUBLIC_API_URL || ""')
[[ -n $api ]] || { echo "Set EXPO_PUBLIC_API_URL in eas.json (build.production.env) first." >&2; exit 1; }
export ANDROID_HOME=${ANDROID_HOME:-$HOME/Library/Android/sdk}
[[ -d $ANDROID_HOME ]] || { echo "Android SDK not found: install it with Android Studio, or set ANDROID_HOME." >&2; exit 1; }
command -v java >/dev/null || { echo "Java not found: install a JDK 17 (Android Studio's, or brew install --cask zulu@17)." >&2; exit 1; }

# The upload key (docs/releases.md, Signing): keystore.properties with storeFile, storePassword, keyAlias, keyPassword.
[[ -f keystore.properties ]] || { echo "keystore.properties is missing: see docs/releases.md (Signing) to create the upload key." >&2; exit 1; }
prop() { sed -n "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*//p" keystore.properties | tail -1; }
store_file=$(prop storeFile); store_password=$(prop storePassword); key_alias=$(prop keyAlias)
missing=$(for k in storeFile storePassword keyAlias keyPassword; do [[ -n $(prop $k) ]] || printf '%s ' $k; done)
[[ -z $missing ]] || { echo "keystore.properties is missing: $missing" >&2; exit 1; }
[[ $store_file == /* ]] || store_file="$root/$store_file"
[[ -f $store_file ]] || { echo "The keystore isn't there: $store_file (storeFile in keystore.properties)." >&2; exit 1; }
# Which key it is: the SHA-1 is what Play Console shows for the upload key. The password goes over stdin.
sha1=$(printf '%s\n' "$store_password" | keytool -list -v -keystore "$store_file" -alias "$key_alias" 2>/dev/null | sed -n 's/^[[:space:]]*SHA1:[[:space:]]*//p' | head -1 || true)
[[ -n $sha1 ]] || { echo "Can't open the key \"$key_alias\" in $store_file: check storePassword and keyAlias." >&2; exit 1; }

# Only a release commit: clean, and tagged v<version> from app.json.
if [[ -n $(git status --porcelain) ]]; then
  echo "You have uncommitted changes. Commit them, then run: npm run release -- patch|minor|major" >&2
  echo "Only a release commit can be built." >&2
  exit 1
fi
version=$(node -p 'require("./app.json").expo.version')
if [[ $(git tag --points-at HEAD) != *"v$version"* ]]; then
  last=$(git describe --tags --abbrev=0 --match 'v*' 2>/dev/null || echo "none yet")
  echo "This commit isn't a release (the last one is $last)."
  read -r -p "Create one now? patch, minor, major, a version like 0.3.0, or Enter to stop: " bump || bump=
  [[ -n $bump ]] || { echo "Nothing built."; exit 1; }
  scripts/release.sh "$bump" || { echo "No release, nothing built." >&2; exit 1; }
  version=$(node -p 'require("./app.json").expo.version')
  echo
fi

IFS=. read -r major minor patch <<<"$version"
code=$((major * 10000 + minor * 100 + patch))
commit=$(git rev-parse --short HEAD)
released=$(git log -1 --format=%cs "v$version")
package=$(node -p 'require("./app.json").expo.android?.package || ""')
label=$([[ $type == aab ]] && echo "AAB, for Play internal testing" || echo "APK, to install on a phone")
out="$root/builds/azignia-$version-$code.$type"

echo
echo "Azignia $version for Android: $label"
printf '  %-10s %s\n' \
  "Release" "v$version, $released, commit $commit" \
  "Build" "versionCode $code" \
  "Package" "$package" \
  "API" "$api" \
  "Signing" "upload key \"$key_alias\", SHA-1 $sha1" \
  "Output" "$out"
echo
echo "What's in it (CHANGELOG.md):"
awk -v v="## $version " 'index($0, v) == 1 { on = 1; next } /^## / { on = 0 } on && NF { print "  " $0 }' CHANGELOG.md
echo
read -r -p "Build it? [Y/n] " ok || ok=n
[[ $ok != [nN] ]] || { echo "Nothing built."; exit 1; }

# Only the build's settings: no .env files, so nothing from development (.env.local) reaches it.
export EXPO_NO_DOTENV=1 EXPO_PUBLIC_API_URL=$api NODE_ENV=production

echo
echo "[1/3] Generating android/ (expo prebuild)"
npx expo prebuild --clean --platform android --no-install
git checkout -q -- package.json   # prebuild rewrites its scripts; the commit is clean, so this only undoes that
grep -q 'signingConfig signingConfigs.release' android/app/build.gradle || {
  echo "android/app/build.gradle isn't signed with the upload key (plugins/withReleaseSigning.js didn't apply)." >&2; exit 1; }

echo
echo "[2/3] Building the signed $type (Gradle)"
task=$([[ $type == aab ]] && echo bundleRelease || echo assembleRelease)
(cd android && ./gradlew "$task" --console=plain)

echo
echo "[3/3] Copying it to builds/"
built=$([[ $type == aab ]] && echo android/app/build/outputs/bundle/release/app-release.aab || echo android/app/build/outputs/apk/release/app-release.apk)
mkdir -p builds
cp "$built" "$out"

echo
echo "Built Azignia $version ($code), $(du -h "$out" | cut -f1 | tr -d ' '):"
echo "  $out"
echo
if [[ $type == aab ]]; then
  echo "Next: Play Console › Azignia › Test and release › Testing › Internal testing › Create new release,"
  echo "upload the .aab and paste v$version's section of CHANGELOG.md as release notes."
else
  echo "Next: copy it to the phone and open it to install (allow installing unknown apps if asked)."
fi
