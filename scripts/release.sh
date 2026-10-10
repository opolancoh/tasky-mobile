#!/usr/bin/env bash
# Cuts a release of the app (docs/releases.md):
#   scripts/release.sh patch|minor|major|<x.y.z>
# Checks main is clean and `npm run check` passes, sets expo.version in app.json, adds a CHANGELOG.md section from the
# commits since the last tag, then waits while you review and edit CHANGELOG.md in any editor. Enter commits
# "Release x.y.z" and tags vx.y.z; n puts everything back. Nothing is built or pushed: it ends by printing the next steps.
set -euo pipefail
cd "$(dirname "$0")/.."

[[ $# -eq 1 ]] || { echo "Usage: scripts/release.sh patch|minor|major|<x.y.z>" >&2; exit 1; }
bump=$1

branch=$(git rev-parse --abbrev-ref HEAD)
[[ $branch == main ]] || { echo "Release from main (you're on $branch)." >&2; exit 1; }
[[ -z $(git status --porcelain) ]] || { echo "Commit or stash your changes first." >&2; exit 1; }

current=$(node -p 'require("./app.json").expo.version')
IFS=. read -r major minor patch <<<"$current"
case $bump in
  major) next="$((major + 1)).0.0" ;;
  minor) next="$major.$((minor + 1)).0" ;;
  patch) next="$major.$minor.$((patch + 1))" ;;
  *) [[ $bump =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Use patch, minor, major or a version like 0.3.0." >&2; exit 1; }
     next=$bump ;;
esac
git rev-parse -q --verify "refs/tags/v$next" >/dev/null && { echo "v$next already exists." >&2; exit 1; }

echo "Checking..."
npm run -s check >/dev/null

# What's in it: every commit since the last tag, but release commits. The first release just says so.
last=$(git describe --tags --abbrev=0 --match 'v*' 2>/dev/null || true)
if [[ -z $last ]]; then
  notes="- First release."
else
  notes=$(git log --no-merges --pretty='- %s' "$last..HEAD" | grep -v '^- Release [0-9]' || true)
  [[ -n $notes ]] || { echo "Nothing to release since $last." >&2; exit 1; }
fi

section="## $next — $(date +%Y-%m-%d)

$notes
"
# Newest first: the new section goes before the first one (after the title and intro).
[[ -f CHANGELOG.md ]] || printf '# Changelog\n\nThe app'"'"'s releases, newest first (docs/releases.md).\n\n' > CHANGELOG.md
SECTION="$section" awk 'BEGIN { s = ENVIRON["SECTION"] } !done && /^## / { print s; done = 1 } { print } END { if (!done) print s }' CHANGELOG.md > CHANGELOG.md.tmp
mv CHANGELOG.md.tmp CHANGELOG.md
NEXT=$next node -e '
const fs = require("fs");
const app = JSON.parse(fs.readFileSync("app.json", "utf8"));
app.expo.version = process.env.NEXT;
fs.writeFileSync("app.json", JSON.stringify(app, null, 2) + "\n");'

# The section as it is in CHANGELOG.md now (after any edits), without its heading.
section_of() { awk -v v="## $next " 'index($0, v) == 1 { on = 1; next } /^## / { on = 0 } on' CHANGELOG.md; }

echo
echo "Release $next (was $current) is ready to review: CHANGELOG.md has a new section at the top."
echo "Edit it in any editor if you want (reword, add notes), save, then come back here."
read -r -p "Enter to continue, n to cancel: " ok
if [[ $ok != [nN] ]]; then
  echo
  echo "Release $next:"
  section_of
  read -r -p "Commit and tag v$next? [Y/n] " ok
fi
if [[ $ok == [nN] ]]; then
  git checkout -- app.json
  if git ls-files --error-unmatch CHANGELOG.md >/dev/null 2>&1; then git checkout -- CHANGELOG.md; else rm CHANGELOG.md; fi
  echo "Nothing changed."
  exit 1
fi

git add app.json CHANGELOG.md
git commit -q -m "Release $next"
git tag -a "v$next" -m "Release $next"
echo "Tagged v$next (local only)."
echo
echo "Build it for testers:"
echo "  npm run build:ios         then  npm run submit:ios   (TestFlight)"
echo "  npm run build:android     then upload the .aab in Play Console (Internal testing)"
echo "When you want it on GitHub:"
echo "  git push && git push origin v$next"
