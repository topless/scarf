# scarf

Your colours, in your calendar. scarf publishes one subscribable calendar feed per national team:
every game with kickoff, venue, TV channel and ticket link, and a reminder an hour before. Fans
subscribe once, and the calendar they already use keeps itself up to date. Fans, not fanatics.

Teams so far: Greece and Spain (men's football and basketball), France and Germany (men's basketball).
The identity, the exact calendar-event copy and the backlog come from the design handover:
[HANDOVER.md](HANDOVER.md), [docs/brand.md](docs/brand.md),
[docs/calendar-event-spec.md](docs/calendar-event-spec.md), [docs/issues.md](docs/issues.md).

## How it works

The "Build feeds" GitHub Actions job runs `npm run build` once a day. The build:

1. fetches the games from the official sources: one UEFA request for every football team, and one FIBA
   page per basketball competition, shared by the teams playing in it;
2. adds what no source provides (TV channel, ticket link) from [src/config.ts](src/config.ts) and [src/manual.ts](src/manual.ts);
3. writes one `dist/{country}/{sport}.ics` per team and `dist/index.html`, which GitHub Pages serves;
4. renders a 1200×630 share image per team at `dist/{country}/{sport}/share.png` and one for the landing
   page at `dist/share.png`, the card a chat app shows when someone pastes a page's address, from
   [src/share.ts](src/share.ts): a team's in its colours with its next game, the landing page's in the
   brand colours with every team's name.

If a source cannot be fetched or its format changed, the build fails and the last published files stay online.

## Paths

Subscriptions point at these paths, so they are frozen (see [HANDOVER.md](HANDOVER.md)):

- `/{country}/{sport}.ics`: one feed per team, for example `/greece/football.ics` and `/greece/basketball.ics`.
- `/`: the page listing every team. Team pages at `/{country}/{sport}/` are planned.

Each event's `UID` is the source's id (`uefa-…`, `fiba-…`) and never changes, so an updated game
replaces the old entry instead of duplicating it.

## One-time setup on GitHub

The repository must be public (GitHub Pages on a free plan). In the repository settings, under
Pages, set the source to "GitHub Actions"; the first run fails until that is done.

The site lives at `https://scarf.fan`. The domain's DNS is at Cloudflare: four `A` and four `AAAA`
records on the apex to GitHub Pages' addresses, and `www` as a `CNAME` to `topless.github.io`, all
"DNS only" (grey cloud) so GitHub can issue the certificate. Under Pages, the custom domain is
`scarf.fan` with "Enforce HTTPS" on. The build takes its address from that setting
(`SITE_URL`), so no `CNAME` file is needed.

## Running it

Needs Node 22.18 or newer. The share images need nothing else: they are laid out by Satori and
rasterised by resvg (WebAssembly), with the two brand fonts bundled in [fonts/](fonts/) under the
SIL Open Font License, so no browser and no network beyond the two sources.

```bash
npm install
npm test
npm run build
```

## Maintaining it by hand

- **TV channel and default ticket link** are per team in [src/config.ts](src/config.ts).
- **One game's details** (time, venue, tickets, a note) go in [src/manual.ts](src/manual.ts), keyed by the game id.
  The id is the first part of the event's `UID` in the calendar file, for example `fiba-127107`.
  Time and venue entered by hand are used only until the official source has its own.
- **A new team** is one more entry in [src/config.ts](src/config.ts): country and sport slugs, the stripe
  colours from [docs/brand.md](docs/brand.md), a flag in `assets/`, and a UEFA team id for football or a
  FIBA event and team code for basketball. A football team costs no extra request; a basketball team in a
  competition that is already fetched costs none either, and each new basketball competition costs one.

## Keeping it running

The daily build is a scheduled GitHub Actions workflow, and GitHub disables scheduled workflows in a
repository that has seen no activity for 60 days. Three things in `.github/workflows/` keep scarf
publishing without anyone pushing a commit:

- **Keepalive.** Every scheduled or manual run of "Build feeds" has a `keepalive` job that re-enables
  both scheduled workflows through the Actions API (`gh workflow enable`). Re-enabling counts as
  repository activity and restarts the 60-day clock, so no stamp commit is needed; a commit pushed by
  the workflow would in any case be rejected, because the `protect-main` ruleset only accepts pull
  requests on `main`. GitHub does not document the reset, but the widely used keepalive actions rely on it.
  If GitHub's "scheduled workflow will be disabled soon" email ever arrives, the keepalive is not
  working: click "Enable workflow" under Actions, then switch to a stamp commit pushed with a token
  that is allowed to bypass the ruleset.
- **Failure alerts.** A failed run of "Build feeds" or "Check feeds" opens an issue labelled `ops`,
  titled "Build feeds failed" or "Check feeds failed", linking to the run. While that issue is open,
  further failures are added to it as comments instead of new issues. An issue opened in your own
  repository reaches you by email like any other. GitHub can also tell you about the failed run itself:
  on github.com open Settings → Notifications, and under "System" → "Actions" open the dropdown (it
  reads "Don't notify" while off), choose "Email" and/or "On GitHub", and tick "Only notify for failed
  workflows". Those run emails for a scheduled workflow go to the person who last changed its `cron` line.
- **Freshness check.** "Check feeds" runs once a day, six hours after the build's slot. It fetches the
  live feeds and reads their `DTSTAMP`, the build time written into every event. If the newest is older
  than 36 hours the check fails and the alert above fires. This is what catches a build that was
  disabled, skipped or stuck rather than one that failed.

To force a build: Actions → Build feeds → Run workflow. To test that a failure reaches you: Actions →
Check feeds → Run workflow with `max_age_hours` set to `0`. Within a few minutes an issue "Check feeds
failed" appears and lands in your inbox; close it once seen, and the next real failure opens a new one.

### What we can see

The health signals we have today, in the order to check them:

- **Run status.** The Actions tab lists every run of "Build feeds" and "Check feeds" with its outcome,
  and a failed run is also an open `ops` issue.
- **Freshness.** The log of a "Check feeds" run prints how many hours old each live feed is.
- **Last run.** The footer of every page shows the date and time of the build that wrote it.

GitHub Pages keeps no access logs and the site carries no tracking, so how often the feeds are fetched
(the closest thing to a subscriber count) and how many people visit the pages cannot be seen today.
That is left for #24, which proposes reading both from Cloudflare once the custom domain is in front
of the site.

## Known limits

- The UEFA endpoint and the FIBA page are undocumented and can change without notice. Their terms do not
  allow automated collection, so this stays a small friends-only tool: per run (the daily run, plus one
  run per push to `main`) one UEFA request for all football teams together and one FIBA request per
  basketball competition.
- Calendar apps refresh subscribed feeds on their own schedule; Google Calendar can take a day. On a Mac,
  choose "Every day" for auto-refresh when subscribing; the default is reportedly weekly.
- Subscribing in Google Calendar only works in a computer browser, not in the phone app.
- Each timed game carries a reminder one hour before kickoff. Apple Calendar shows it unless "Remove alarms"
  is on for the subscription; Google Calendar is believed to ignore embedded reminders, but lets you set a
  notification for the whole calendar in its settings. Outlook is unverified.
- Games with no announced time appear as all-day entries marked "time not announced".

Background on the data sources: [docs/research-2026-10-02.md](docs/research-2026-10-02.md).
