#!/usr/bin/env bash
# Cuts a release of the app (docs/releases.md):
#   scripts/release.sh patch|minor|major|<x.y.z>
# Checks main is clean and `npm run check` passes, bumps expo.version in app.json, adds a CHANGELOG.md section from the
# commits since the last tag, then waits while you review and edit CHANGELOG.md in any editor. Enter commits
# "Release x.y.z" and tags vx.y.z; n puts everything back. Everything stays local: it ends by printing how to push and publish.
set -euo pipefail
cd "$(dirname "$0")/.."

bump=${1:-}
[[ -n $bump && $# -eq 1 ]] || { echo "Usage: scripts/release.sh patch|minor|major|<x.y.z>" >&2; exit 1; }

branch=$(git rev-parse --abbrev-ref HEAD)
[[ $branch == main ]] || { echo "Release from main (you're on $branch)." >&2; exit 1; }
[[ -z $(git status --porcelain) ]] || { echo "Commit or stash your changes first." >&2; exit 1; }

current=$(node -p 'require("./app.json").expo.version')
IFS=. read -r major minor patch <<<"$current"
case $bump in
  major) next="$((major + 1)).0.0" ;;
  minor) next="$major.$((minor + 1)).0" ;;
  patch) next="$major.$minor.$((patch + 1))" ;;
  *.*.*) next=$bump ;;
  *) echo "Use patch, minor, major or a version like 0.1.0." >&2; exit 1 ;;
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
# Cancelling (n at a prompt, or Ctrl+C from here until the commit) puts both files back as they were.
restore() {
  git checkout -- app.json
  rm -f CHANGELOG.md.tmp
  if git ls-files --error-unmatch CHANGELOG.md >/dev/null 2>&1; then git checkout -- CHANGELOG.md; else rm -f CHANGELOG.md; fi
}
trap 'echo; restore; echo "Cancelled. Nothing changed."; exit 130' INT TERM

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
read -r -p "Enter to continue, n to cancel: " ok || ok=n   # Ctrl+D cancels too
if [[ $ok != [nN] ]]; then
  echo
  echo "Release $next:"
  section_of
  read -r -p "Commit and tag v$next? [Y/n] " ok || ok=n
fi
if [[ $ok == [nN] ]]; then
  restore
  echo "Nothing changed."
  exit 1
fi

trap - INT TERM
git add app.json CHANGELOG.md
git commit -q -m "Release $next"
git tag -a "v$next" -m "Release $next"
echo "Tagged v$next (local only)."
echo
echo "When you want it on GitHub:"
echo "  git push && git push origin v$next"
echo "Then, for a GitHub Release, paste this section of CHANGELOG.md at:"
echo "  $(git remote get-url origin | sed -e 's/\.git$//' -e 's#^git@github.com:#https://github.com/#')/releases/new?tag=v$next"
