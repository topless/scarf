---
name: feature
description: "Take a change to scarf from request to merged pull request through the project's lifecycle - find or open the GitHub issue, plan on the issue, implement on a branch with tests, review, verify every acceptance criterion, open a PR that closes the issue, check the deploy. Use it for every feature request, enhancement, fix or change to what fans see or what the build does, whether the maintainer says 'add Denmark', 'the footer should go', 'implement #40', 'let's do the tickets event' or pastes an idea, even when no issue exists yet and even when the change looks small enough to just do. Not for questions, research without a code change, or operating the existing workflows."
argument-hint: "<the request in a sentence, or #issue>"
---

# Feature lifecycle

Request: $ARGUMENTS

Every change to scarf, however small, walks the same road: an issue that says what changes for a fan
and how we will know it worked, a plan written on that issue, a branch with tests, a review, a
verification against the acceptance criteria, a pull request that closes the issue, and a look at the
deploy. The road is short for a one-line copy fix and long for a new source, but no step is skipped,
because each one leaves a record the next session (or the maintainer, months later) will read: the
issue is the why, the plan comment is the how, the PR body is the release note and the evidence.

Read `CLAUDE.md` first if it is not already in context; it holds the rules this skill keeps pointing at.

| Phase | Output | Lives in | Stop and ask when… |
|---|---|---|---|
| 1 Intake | the issue, with acceptance criteria | GitHub issue | a PR is already open for it; the request reads two ways that lead to different work |
| 2 Prework | size, then the plan: approach, files, tests, assumptions | comment on the issue | an approach choice; a new request to a source; a path, UID, dependency or brand change |
| 3 Implement | commits on a branch, with tests | branch | the scope wants to grow |
| 4 Review | preflight clean, findings fixed | branch | a finding is a design question |
| 5 Verify | evidence per acceptance criterion | notes for the PR body | a criterion cannot be checked here |
| 6 Pull request | PR that closes the issue | GitHub PR | never merge; that is the maintainer's |
| 7 After the merge | deploy checked, issue closed | GitHub | the live site disagrees with the PR |

"Stop and ask" follows the maintainer's standing rule: ask, don't assume. When nobody is there to
answer, pick the most reasonable reading, write it under **Assumptions** on the issue and in the PR,
and open the PR as a draft if the question would have changed the shape of the work. Two stops hold
even unattended, because carrying on would create a mess rather than a draft: a PR already open for
the same issue (report it, never open a second one), and anything that adds a request to a source.

## 1 Intake: find or open the issue

Restate the request in one sentence in the project's words (game not event, reminder not
notification, "time not announced" not TBA). Then look for what already exists; this repository runs
many branches in parallel and the request may already be in flight:

```bash
gh issue list --state all --limit 100 --search "<two or three keywords>"
gh pr list --state open --json number,title,headRefName,files \
  --jq '.[] | "#\(.number)\t\(.title)\t\(.headRefName)\n\t\([.files[].path] | join(" "))"'
```

- **An issue exists.** Read it and its comments. Without a terminal, `gh issue view N --comments`
  prints nothing at all when there are no comments, so use the two calls that always answer:

  ```bash
  gh issue view N
  gh api repos/topless/scarf/issues/N/comments --jq '.[] | "--- \(.user.login) \(.created_at)\n\(.body)"'
  ```

  Work from the issue. If it has no **Acceptance** line, write one as a comment before any code,
  whatever the size of the change: the criteria are what phase 5 checks and what the PR's
  Verification answers, so they have to exist first. Propose them; do not edit the maintainer's text.
- **A PR is already open for it.** Compare what it changes with the issue's "What changes"
  (`gh pr view N --json files`, `gh pr diff N`), and report: the PR, whether it is green and
  mergeable, and what it covers and misses. Then stop; the maintainer decides. Told to continue
  there: `gh pr checkout N` (in a fresh worktree when the environment offers one) and go to phase 3
  on that branch. Never open a second PR for the same issue.
- **Nothing exists.** Draft the issue from `.github/ISSUE_TEMPLATE/feature.md` (read it; it carries
  the shape and the label set). The title is in sentence case and says what changes for a fan, with
  no type prefix (issues are not commits). Labels come from the repository's own set, and a
  milestone when one fits (`gh api repos/topless/scarf/milestones --jq '.[].title'`). Show the draft
  and any questions to the maintainer in one message, then create it:

  ```bash
  gh issue create --title "<title>" --label pages,brand --milestone "<milestone>" --body-file -
  ```

Acceptance criteria are the heart of the issue: checks someone else can run, not intentions. "The
basketball page contains no 'kickoff' outside the page script" can be verified; "the copy fits
basketball" cannot. Write them so that phase 5 is a checklist.

A bug report takes the same shape with the `bug` label.

## 2 Prework: size it, then plan on the issue

Size the change now, with the issue in hand, by how much is undecided and what the rules guard,
not by the number of files (dropping a footer line touches five files and is still small):

- **Small.** One reading, no decision to make, nothing the rules guard (paths, UIDs, requests,
  brand, dependencies), and the tests say when it is done. The issue body is the plan: skip the
  plan comment (the acceptance-criteria comment from phase 1 still happens when the issue has
  none) and say "Small" in the first line of the PR body instead.
- **Normal.** A decision to make, or a surface fans see or subscribe to changes. The full plan
  comment below.
- **Spike first.** A question reading cannot answer: a new source, a calendar client's behaviour,
  two approaches with different costs. The first PR is a note in `docs/` with the decision, in the
  shape of `docs/research-2026-10-02.md` and `docs/spike-team-picker.md` (#28); the feature follows,
  re-planned on the same or a new issue.

Then read what governs the area and what already touches it:

- `CLAUDE.md`, then the doc that owns the surface: `docs/calendar-event-spec.md` for anything in a
  feed, `docs/brand.md` for anything a fan sees, `README.md` for ops and running the build. Grep the
  doc for the surface's words first (`grep -n -i footer docs/brand.md`); read it whole only when it
  has something to say, and note when it is silent, because then the PR is the first record.
- The source files involved and their tests in `test/`. A test file shows how a module is meant to be
  driven and what the last person thought worth protecting.
- Open PRs touching the same files (the `gh pr list` call above), then where their hunks sit, so the
  plan can say which lines collide rather than which files:

  ```bash
  for n in <numbers>; do echo "## #$n"; gh pr diff "$n" | grep -E '^(diff --git|@@)'; done
  ```

  The maintainer often merges several PRs the same day; knowing where they collide saves a rebase.

Check the request against the rules that are easy to break without noticing: one request per source
per run (a new competition or source is a new request and needs the maintainer's yes), frozen paths
and UIDs, voice, no tracking or accounts, no new dependency without a reason the PR can state.

Then write the plan as a comment on the issue, so the record lives where the next person looks:

```markdown
**Size.** Normal.
**Approach.** What we do and why; the alternative considered and why not.
**Files.** `src/page.ts` (…), `assets/site.css` (…), `test/page.test.ts` (…).
**Tests.** What each new test protects, one line each.
**Acceptance → evidence.** Each criterion and how it will be shown.
**Assumptions.** What was decided without asking, and why it seemed safe.
**Open questions.** Only the ones that change the work. "None" is a fine answer.
**Overlaps.** #36 touches the same footer block in `src/page.ts` (its hunk at `function footer`).
```

```bash
gh issue comment N --body-file -
```

Open questions that change the shape of the work are the gate: ask, wait. If the maintainer is not
here, choose, record under Assumptions, and carry on.

## 3 Implement

- **Branch.** In a Claude worktree the `claude/…` branch is already yours; the app tracks it, so
  leave its name alone. The record is the PR title and body, not the branch, which goes when the PR
  merges. Otherwise `git switch -c feat/<slug>` from an up-to-date `main`. Never commit on `main`;
  the `protect-main` ruleset rejects the push anyway.
- **Tests with the code.** Tests run from fixtures in `test/fixtures/`; a test never makes a live
  request. A new behaviour gets a test that would fail without it; a changed string gets its
  assertion updated, not deleted.
- **Scope.** Build what the issue says. A smell found on the way goes into the PR's "Noticed, not
  changed" and, if it matters, its own issue. Fixing it here muddies both the review and the record.
- **Docs in the same change.** When the change makes `README.md`, `CLAUDE.md`, a spec in `docs/`, a
  mockup in `reference/` or a recipe in this skill's `references/` wrong, fix it in the same PR. A doc
  that lags the code is how the next session repeats a mistake; the preflight points at the ones it
  can see.
- **Voice.** Every string a fan can read follows CLAUDE.md "Voice". The preflight greps for the usual
  slips, but the sentence has to read right too.
- **Commits.** Conventional Commits (`feat(pages): …`, `fix(feeds): …`, `ci: …`, `docs: …`) with the
  body as release notes: one bullet per user-visible change, files in backticks. The squash message
  of the merged PR is what `git log` keeps, so the PR body is written the same way.

## 4 Review

Run the preflight from the repository root. It runs the tests and the deterministic checks and prints
what the human review should look at:

```bash
bash .claude/skills/feature/scripts/preflight.sh
```

Then read the whole diff once as a reviewer would, with `references/review-checklist.md` beside it:

```bash
git diff "$(git merge-base HEAD origin/main)"
```

Run `/code-review` at medium and fix the real findings. A finding that is a design disagreement
rather than a defect goes to the maintainer, not into the code. Changes to the fetch code
(`src/uefa.ts`, `src/fiba.ts`) or to `.github/workflows/` also get `/security-review`.

## 5 Verify

Take the acceptance criteria from the issue one by one and produce evidence for each, following the
recipes in `references/verify.md` for the area (feeds, pages, share images, data, workflows). Keep the
numbers and the spot checks; they go into the PR body under Verification.

Two rules sit above the recipes:

- `npm test` green is necessary, never sufficient. The tests protect what earlier changes cared
  about; they do not know this change's criteria.
- `npm run build` is a real run: one live request to UEFA and one FIBA page per competition. The
  sources' terms do not allow bulk collection, so one real build per task is the budget, with
  `SITE_URL` set as Actions sets it. Count every live request the task made, probes included, and
  write the count in the PR. Pages, cards and feeds render from hand-built games instead (the recipe
  shows how); nothing on that path touches the network.

A criterion that cannot be checked here (a workflow that only runs from `main`, a calendar client's
behaviour) is not skipped: it becomes a numbered step under "Verify after merging" in the PR, as #29 did.

## 6 Pull request

```bash
git push -u origin HEAD
gh pr create --title "<type(scope): what changes>" --body-file -   # --draft while a question is open
```

The title is a Conventional Commit of at most 72 characters. The body follows
`.github/pull_request_template.md` (read it): bullets of what changes for a fan or the maintainer,
then Verification, Assumptions, Noticed not changed, Overlaps with other PRs, Verify after merging
when workflows changed, and `Closes #N` last so the issue closes on merge. A section with nothing to
say is deleted, not left as a heading.

Afterwards:

- Where the environment offers it (the Claude desktop app does), bind the PR so CI failures and
  review comments reach the session. The `Test` workflow runs on every PR; a red check is yours to fix.
- Answer every review comment in its thread and push the fix. Never force-push over the maintainer's
  commits on the branch.
- Merging is the maintainer's decision. Do not merge and do not enable auto-merge; say the PR is
  ready and what you would look at first.

## 7 After the merge

"Build feeds" runs on every push to `main` and deploys `dist/` to GitHub Pages.

```bash
gh run list --workflow "Build feeds" --limit 1
gh run watch "$(gh run list --workflow 'Build feeds' --limit 1 --json databaseId --jq '.[0].databaseId')"
curl -sI https://topless.github.io/scarf/<path> | head -1     # our own output, not a source
```

Reading the live site is not a source request. Check the paths the PR touched; for a feed, that the
UIDs are the ones the PR expected. The issue closes by itself through `Closes #N`. If the PR left a
"Verify after merging" list, run what can be run, post the results as a comment on the issue, and
leave open what needs the maintainer.

## Files in this skill

- `references/verify.md`: how to produce evidence per area without spending source requests.
- `references/review-checklist.md`: the scarf-specific review pass.
- `scripts/preflight.sh`: tests, commit-message convention, voice grep, frozen-path, new-request and
  docs-left-behind warnings.
- `.github/ISSUE_TEMPLATE/feature.md` and `.github/pull_request_template.md` in the repository hold
  the issue and PR shapes; this skill fills them rather than keeping a second copy.
