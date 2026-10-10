#!/usr/bin/env bash
# Builds the app for testers with EAS (docs/releases.md):
#   scripts/build.sh ios            in Expo's cloud; then `npm run submit:ios` sends it to TestFlight
#   scripts/build.sh android [apk]  on this Mac (eas build --local, free): builds/tasky-<version>-<time>.aab (or .apk)
# The version is app.json's; EAS adds the build number. Asks first when the commit isn't the release tag v<version>.
set -euo pipefail
cd "$(dirname "$0")/.."

usage() { echo "Usage: scripts/build.sh ios | android [apk]" >&2; exit 1; }
platform=${1:-}
type=${2:-aab}
case $platform in
  ios) [[ $# -eq 1 ]] || usage ;;
  android) [[ $type == aab || $type == apk ]] || usage ;;
  *) usage ;;
esac

version=$(node -p 'require("./app.json").expo.version')
api=$(node -p 'require("./eas.json").build.production.env.EXPO_PUBLIC_API_URL || ""')
[[ -n $api ]] || { echo "Set EXPO_PUBLIC_API_URL in eas.json (build.production.env) first." >&2; exit 1; }
eas whoami >/dev/null 2>&1 || { echo "Sign in to Expo first: eas login" >&2; exit 1; }
if [[ $platform == android ]]; then
  [[ -n ${ANDROID_HOME:-} ]] || { echo "Set ANDROID_HOME (the Android SDK) for a local build." >&2; exit 1; }
fi

if [[ $(git tag --points-at HEAD) != *"v$version"* || -n $(git status --porcelain) ]]; then
  echo "This isn't release v$version as tagged (another commit, or uncommitted changes)."
  read -r -p "Build it anyway? [y/N] " ok
  [[ $ok == [yY] ]] || exit 1
fi

echo "Building Tasky $version for $platform, API $api"
if [[ $platform == ios ]]; then
  eas build --platform ios --profile production
else
  mkdir -p builds
  out="builds/tasky-$version-$(date +%Y%m%d-%H%M).$type"
  profile=$([[ $type == apk ]] && echo production-apk || echo production)
  eas build --platform android --profile "$profile" --local --output "$out"
  echo
  echo "Built $out"
  [[ $type == aab ]] && echo "Upload it in Play Console › Test and release › Testing › Internal testing › Create new release." || echo "Copy it to the phone and open it to install."
fi
