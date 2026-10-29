# Review checklist for scarf

Read the whole diff once, as the maintainer would, before fixing anything. The preflight has already
run the tests and grepped for the obvious slips; this pass is for what a grep cannot see.

## It does what the issue says, and only that

- Each acceptance criterion maps to a change and to a test.
- Nothing unrelated changed; smells seen on the way are listed under "Noticed, not changed" in the PR.
- Scope that grew was agreed on the issue, not silently.

## The rules a fan would feel

- Paths unchanged: `/{country}/{sport}.ics`, `/{country}/{sport}/`, `/{country}/{sport}/share.png`,
  `/`. A new path follows the scheme and is added to CLAUDE.md "Paths".
- UIDs: `<source id>@scarf`, unchanged for existing games; a new event type gets its own stable
  suffix (`-tickets@scarf`), never a date or a counter.
- Updates land in place: a changed kickoff keeps its UID; `SEQUENCE` and `DTSTAMP` behaviour is
  untouched unless the issue is about it.
- Copy: sentence case; no `!`, emoji, "notification", TBA/TBC or "don't miss out"; "we" is the team
  and "you" is the fan; every time names its city; `docs/calendar-event-spec.md` governs every ICS
  string byte for byte.
- Brand: colours come from `assets/brand-tokens.css` or the team's config, not new hex values in
  code; the brand surface stays neutral; pages load fonts from Google Fonts, cards use the bundled TTFs.

## The rules the sources would feel

- Still one UEFA request per run and one FIBA page per competition. No fetch added "to check", no
  retry loop that multiplies requests, no request from a test.
- A failed fetch or a changed shape throws, so the build fails and the last published `dist/` stays
  online. No silent fallback to partial data.
- Hand-entered time and venue yield to the source (`withDetails`); manual data only fills gaps.

## The site stays static and quiet

- No accounts, logins, tracking, third-party scripts, cookies or analytics.
- No new runtime dependency without a reason the PR states; nothing platform-specific (Actions runs
  Ubuntu, the maintainer runs macOS; the WebAssembly resvg is there for that reason).
- The secondary domain is never printed.

## Code

- Fails loudly where data could be wrong (missing ids, unexpected shapes) rather than guessing.
- Anything from a source that reaches HTML goes through the escaper; URLs are encoded.
- Types narrow rather than widen (a sport is a union, not a string), so a new case has to bring its
  words with it.
- Comments say why, in the file's existing voice. No commented-out code, no TODO without an issue number.
- Tests assert the fan-visible string, not an implementation detail; a changed string updates the
  assertion rather than loosening it.

## Record

- README, CLAUDE.md and docs updated where the change made them wrong.
- Commit messages are Conventional Commits with release-note bullets in the body.
- The PR body names the live requests made, the assumptions taken, and the overlaps with open PRs.
