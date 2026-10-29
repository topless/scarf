#!/usr/bin/env bash
# Preflight for a scarf change: the deterministic part of the review step in
# .claude/skills/feature/SKILL.md. Runs the tests, checks the branch's commit messages against
# Conventional Commits, and greps the diff for the slips CLAUDE.md warns about: voice, frozen paths
# and UIDs, a new request to a source, a new dependency, a workflow change, a doc left behind.
# Fails only on failing tests, a commit on main or a non-conventional commit message; everything else
# is a warning for the human review that follows. Run from the repository root.
set -uo pipefail

if [ ! -f package.json ] || [ ! -d src ]; then
  echo "run from the repository root" >&2
  exit 2
fi

base_ref=origin/main
git rev-parse --verify -q "$base_ref" >/dev/null 2>&1 || base_ref=main
base=$(git merge-base HEAD "$base_ref")
branch=$(git branch --show-current)
status=0
warnings=0
ok() { printf '  ok    %s\n' "$*"; }
note() { printf '  note  %s\n' "$*"; }
warn() { printf '  warn  %s\n' "$*"; warnings=$((warnings + 1)); }
fail() { printf '  FAIL  %s\n' "$*"; status=1; }

# Added lines of the diff against the base, committed and uncommitted alike, for the given paths.
added() { git diff "$base" -- "$@" | grep '^+' | grep -v '^+++' | cut -c2-; }

echo "branch"
if [ "$branch" = "main" ]; then
  fail "on main; the protect-main ruleset only accepts pull requests"
else
  ok "$branch, $(git rev-list --count "$base..HEAD") commit(s) over $base_ref"
fi
if [ -n "$(git status --porcelain)" ]; then
  note "uncommitted changes; the checks below read them too"
fi

echo "commit messages"
while IFS= read -r subject; do
  [ -z "$subject" ] && continue
  if printf '%s' "$subject" | grep -qE '^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9., -]+\))?!?: .+'; then
    if [ "${#subject}" -gt 72 ]; then warn "over 72 characters: $subject"; else ok "$subject"; fi
  else
    fail "not a Conventional Commit: $subject"
  fi
done <<<"$(git log --format=%s "$base..HEAD")"

echo "tests"
if ! npm ls --depth=0 >/dev/null 2>&1; then
  note "node_modules is missing or out of step with the lockfile; run npm ci first"
fi
log=$(mktemp)
if npm test >"$log" 2>&1; then
  ok "npm test: $(awk '/^# pass/ {print $3}' "$log") passed, $(awk '/^# fail/ {print $3}' "$log") failed"
else
  fail "npm test failed; last lines:"
  tail -n 20 "$log" | sed 's/^/        /'
fi
rm -f "$log"

echo "voice in fan-readable code (src/, assets/, reference/)"
slips=$(added src assets reference | grep -inE '\bTBA\b|\bTBC\b|notification|don.t miss|Event schedule' || true)
if [ -n "$slips" ]; then
  warn "words CLAUDE.md rules out were added:"
  printf '%s\n' "$slips" | sed 's/^/        /'
else
  ok "no TBA, TBC, notification, don't miss, Event schedule"
fi
bangs=$(added src assets reference | perl -ne 'print if /["'"'"'`][^"'"'"'`\n]*!(?!=)[^"'"'"'`\n]*["'"'"'`]/' || true)
if [ -n "$bangs" ]; then
  warn "an exclamation mark inside a string literal; fans read no exclamation marks:"
  printf '%s\n' "$bangs" | sed 's/^/        /'
fi
emoji=$(added src assets reference | perl -CSD -ne 'print if /[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]/' || true)
if [ -n "$emoji" ]; then
  warn "emoji added; the voice has none:"
  printf '%s\n' "$emoji" | sed 's/^/        /'
fi

echo "frozen paths and UIDs"
frozen=$(git diff "$base" -- src/config.ts src/ics.ts | grep -E '^[-+][^-+]' | grep -E 'feedPath|sharePath|landingSharePath|@scarf|\buid\b' || true)
if [ -n "$frozen" ]; then
  warn "path or UID code changed; CLAUDE.md says paths and UIDs never change:"
  printf '%s\n' "$frozen" | sed 's/^/        /'
else
  ok "feedPath, sharePath and the UID shape untouched"
fi

echo "requests to the sources"
fetches=$(added src | grep -n 'fetch(' || true)
if [ -n "$fetches" ]; then
  warn "a fetch was added in src/; one request per source per run, and nothing new without an issue:"
  printf '%s\n' "$fetches" | sed 's/^/        /'
else
  ok "no new fetch in src/"
fi

echo "dependencies"
if git diff --quiet "$base" -- package.json; then
  ok "package.json unchanged"
else
  warn "package.json changed; the PR states why, and the lockfile moves with it"
fi

echo "workflows"
if git diff --quiet "$base" -- .github/workflows; then
  ok "no workflow changed"
else
  warn "workflows changed; they only run from main, so the PR needs a 'Verify after merging' list"
  if command -v actionlint >/dev/null 2>&1; then
    if actionlint; then ok "actionlint clean"; else fail "actionlint found problems"; fi
  else
    note "actionlint is not installed (brew install actionlint); lint by hand"
  fi
fi

echo "docs"
if ! git diff --quiet "$base" -- src && git diff --quiet "$base" -- README.md CLAUDE.md docs reference .claude/skills/feature/references; then
  note "src/ changed and no doc did; confirm README, CLAUDE.md, docs/, reference/ and the skill's recipes are still right"
else
  ok "docs moved with the code, or no code changed"
fi
if ! git diff --quiet "$base" -- src/page.ts src/share.ts src/ics.ts; then
  if ! grep -qE 'renderTeamPage\(|renderLanding\(|renderShareImage\(|toIcs\(' src/page.ts src/share.ts src/ics.ts; then
    warn "a renderer the verify.md recipe calls is gone; update .claude/skills/feature/references/verify.md"
  else
    note "renderers changed; the recipe in .claude/skills/feature/references/verify.md calls them, so run it once"
  fi
fi

echo "pull request"
body=$(gh pr view --json body --jq .body 2>/dev/null || true)
if [ -z "$body" ]; then
  note "no PR yet; the body ends with 'Closes #N'"
elif printf '%s' "$body" | grep -qE '(Closes|Fixes|Resolves) #[0-9]+'; then
  ok "the PR closes an issue"
else
  warn "the PR body does not close an issue; add 'Closes #N'"
fi

echo
if [ "$status" -ne 0 ]; then
  echo "preflight failed; fix the FAIL lines before the review"
else
  echo "preflight passed with $warnings warning(s); now read the diff with references/review-checklist.md"
fi
exit "$status"
