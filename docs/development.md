# Development

How scarf is built, set up, run and kept running. The [README](../README.md) says what it is.

## How it works

The "Build feeds" GitHub Actions job runs `npm run build` once a day. The build:

1. fetches the games from the official sources: one UEFA request for every football team, national or
   club; one FIBA page per basketball competition, shared by the national teams playing in it; and one
   EuroLeague Basketball request per season code, shared by the clubs playing in it;
2. adds what no source provides (TV channel, ticket link) from [src/config.ts](../src/config.ts) (national teams),
   [src/clubs.ts](../src/clubs.ts) (clubs) and [src/manual.ts](../src/manual.ts);
3. writes one feed, its `-alerts` variant and one page per team: `dist/{country}/{sport}.ics` and
   `dist/{country}/{sport}/index.html` for a national team, `dist/{country}/{sport}/{club}.ics` and
   `dist/{country}/{sport}/{club}/index.html` for a club; one country page `dist/{country}/index.html` listing
   that country's national teams and clubs, one page per competition `dist/{sport}/{competition}/index.html`
   listing its clubs, the landing page `dist/index.html` and the How it works page
   `dist/how-it-works/index.html`, which a Cloudflare Worker serves at scarf.fan;
4. renders a 1200×630 share image next to each team's page (`share.png`, a club's included), one per country
   at `dist/{country}/share.png` and one for the landing page at `dist/share.png`, the card a chat app shows
   when someone pastes a page's address, from [src/share.ts](../src/share.ts): a team's in its colours with
   its next game, a country's in its colours with its national teams' names, the landing page's in the brand
   colours; a competition page has none;
5. records the games it saw in `known-games.json` and the sources' answers in `source-answers/`, which the
   Actions job keeps in its cache between runs (not in git), so the next run can tell a newly announced game
   from an old one, and a run on a push to `main` can reuse the last run's answers instead of asking again.

If a source cannot be fetched or its format changed, the build fails and the last published files stay online.

## Paths

Subscriptions point at the feeds, and every event's footer names the team page, so those paths are
frozen, a club's as a national team's. Every other page may move, with a redirect from its old address.

- `/{country}/{sport}.ics`: one feed per team, for example `/greece/football.ics` and `/greece/basketball.ics`.
- `/{country}/{sport}-alerts.ics`: the same feed plus an all-day "New game" entry on the day a game is announced,
  for fans who pick "Games and announcements" on the team page.
- `/{country}/{sport}/`: the team's page, for example `/greece/football/`, with its share image at
  `/{country}/{sport}/share.png`.
- `/{country}/{sport}/{club}.ics`, `/{country}/{sport}/{club}-alerts.ics` and `/{country}/{sport}/{club}/`
  with its `share.png`: a club's feeds and page, the same three as a national team's, for example
  `/greece/basketball/olympiacos.ics` and `/greece/basketball/olympiacos/`. The path names the club's
  country and sport, never its competition, so it holds from season to season.
- `/{country}/`: the country's page listing its national teams, then its clubs, for example `/greece/`,
  with its share image at `/{country}/share.png`.
- `/{sport}/{competition}/`: a competition's page listing this season's clubs, each linking to the club's
  page: `/basketball/euroleague/`, `/basketball/eurocup/`, `/football/champions-league/`. No feed and no
  share image.
- `/`: the landing page, with its share image at `/share.png`.
- `/how-it-works/`: the How it works page, linked from every top bar.
- `/privacy/`: the privacy page, linked from every footer.
- `/kit/`: the identity kit, unlisted and `noindex` ([docs/brand.md](brand.md), Countries, clubs and sports).

Each event's `UID` is the source's id (`uefa-…`, `fiba-…`, `euroleague-…`) and never changes, so an updated game
replaces the old entry instead of duplicating it.

## One-time setup

The site at `https://scarf.fan` is `dist/` served as static assets by the Cloudflare Worker `scarf`
([wrangler.jsonc](../wrangler.jsonc)); "Build feeds" deploys it with Wrangler. The build's `SITE_URL`
is set in the workflow.

- **Token.** One repository secret, `CLOUDFLARE_API_TOKEN`. In the Cloudflare dashboard, My Profile →
  API Tokens → Create Token, template "Edit Cloudflare Workers", limited to this account and the
  scarf.fan zone; then `gh secret set CLOUDFLARE_API_TOKEN --repo topless/scarf` and paste it.
- **DNS** is at Cloudflare. `scarf.fan` is the Worker's custom domain (the `routes` entry in
  wrangler.jsonc), so Cloudflare keeps its record and certificate. `staging.scarf.fan` is the custom
  domain of the Worker `scarf-staging` the same way (`env.staging`). `www` is a proxied placeholder
  record (`AAAA 100::`) with a redirect rule that sends every request to `https://scarf.fan` with the
  same path. "Always Use HTTPS" is on, so a calendar that asks over `http://` ends on https.
- **GitHub Pages** stays on, with the custom domain `scarf.fan` and its last deployment, only so the
  addresses from before 22 October 2026 (`topless.github.io/scarf/…`) keep redirecting to scarf.fan.
  That needs the repository public (GitHub Pages on a free plan), and the
  `_github-pages-challenge-topless` TXT record keeps the domain verified to this GitHub account.
- **Visitor key (#71).** The Worker's daily visitor hash needs a secret, a random 32-byte hex string:
  `npx wrangler secret put VISITOR_KEY` for scarf.fan and `npx wrangler secret put VISITOR_KEY --env staging`
  for staging. Until it is set the Worker still counts, with an empty hash.

## Running it

Needs Node 22.18 or newer. The share images need nothing else: they are laid out by Satori and
rasterised by resvg (WebAssembly), with the two brand fonts bundled in [fonts/](../fonts/) under the
SIL Open Font License, so no browser and no network beyond the sources.

```bash
npm install
npm test
npm run build
```

A local build also writes `known-games.json` and `source-answers/` in the repository root, which git ignores.

`npm run build` asks UEFA, FIBA and EuroLeague for live data. To check a page change without asking them, build
from the test fixtures and serve `dist/` the way scarf.fan does:

```bash
npm run build:fixtures
npx wrangler dev
```

then open http://localhost:8787/greece/football/. The fixture build reads the sources' answers saved in
[test/fixtures/](../test/fixtures/), dated on the day they were saved so their games stay upcoming. It
makes no request at all and leaves `known-games.json` and `source-answers/` alone. `npm run build:staging`
builds the same way from the `source-answers/` an earlier `npm run build` left, whatever its age.

To review the pages for drift before a page change ships, run `/ui-review main` in Claude Code, or
by hand `node .claude/skills/ui-review/measure.ts --base main`. It builds from the fixtures, serves
`dist/` on 8787 or the next free port (the Browser pane's `site` entry in [.claude/launch.json](../.claude/launch.json)
serves the same folder, to look at the pages by eye), screenshots every page kind at a phone and a desktop size into `dist/ui-review/`,
measures what drifts (overflow, where the headline starts, red actions per screen, the top bar's rows,
page height, the Share button's room, each component against [docs/brand.md](brand.md)) and prints
what changed since the base. The limits sit at the top of the script; the report's shape is in
[.claude/skills/ui-review/SKILL.md](../.claude/skills/ui-review/SKILL.md). Needs Google Chrome.

To put a branch on https://staging.scarf.fan, add the label `staging` to its pull request (#85). The
"Deploy staging" workflow builds the branch as merged into main with production's data: the sources'
answers and the known games the last daily build saved in its Actions cache, taken as they are, so it
makes no source request (a source the branch adds, which production has no answer for, uses its
fixture). It writes a `dist/_headers` file with `X-Robots-Tag: noindex` that keeps staging out of
search engines, and deploys `dist/` to the Worker `scarf-staging`. Nothing deploys on a push: to put a
newer commit on staging, remove the label and add it again. A pull request from a fork cannot be staged
(GitHub gives it no secrets), nor one that conflicts with main until the conflict is resolved. A branch
without a pull request goes the same way from the Actions tab (Deploy staging → Run workflow → pick the
branch) once it contains the workflow, so merge main into a branch cut before it. A newer run cancels an
older one, so staging shows the branch asked for last. Why the Worker cannot take scarf.fan:
`env.staging` in [wrangler.jsonc](../wrangler.jsonc).

## Definition of done for a feed change

- `npm test` passes; the ICS validates (an `icalendar` validator or an `ical.js` parse) and the changed
  feeds import into Apple Calendar and Google Calendar without warnings.
- The event copy matches [docs/calendar-event-spec.md](calendar-event-spec.md) byte for byte for the
  sample fixture, and passes its voice checks.

## Maintaining it by hand

- **TV channel and default ticket link** are per team in [src/config.ts](../src/config.ts), per club in
  [src/clubs.ts](../src/clubs.ts).
- **One game's details** (time, venue, tickets, a note) go in [src/manual.ts](../src/manual.ts), keyed by the game id.
  The id is the first part of the event's `UID` in the calendar file, for example `fiba-127107`.
  Time and venue entered by hand are used only until the official source has its own.
- **A ticket sale** is an `onSale` day (`YYYY-MM-DD`, at the venue) next to the ticket link in that game's
  entry in [src/manual.ts](../src/manual.ts). The feed then carries an all-day "Tickets on sale · Greece vs Serbia"
  event on that day: it links to the ticket page, names the game's date, kickoff and venue, and reminds
  the fan at 09:00 at the venue. It leaves the calendar together with the game; remove the day to remove
  it earlier. Skip it for a sale that has already opened, as the event would only sit in the past.
- **A new team** is one more entry in [src/config.ts](../src/config.ts): country and sport slugs, the stripe
  colours from [docs/brand.md](brand.md), the flag's code, and a UEFA team id for football or a
  FIBA event and team code for basketball. The flags come from [flag-icons](https://github.com/lipis/flag-icons)
  (MIT): the code is the lowercase ISO 3166-1 alpha-2 country code, or one of its sub-national codes
  such as `gb-eng`, and the build copies the flags it uses to `dist/flags/` with the licence. A football
  team costs no extra request; a basketball team in a competition that is already fetched costs none
  either, and each new basketball competition costs one.
- **A new club** is one more entry in [src/clubs.ts](../src/clubs.ts): its country (a `COUNTRIES` row in
  [src/config.ts](../src/config.ts) first if the country has none), sport, slug, name, home city, ground and
  competition, the kit colours, and a UEFA team id for football or a EuroLeague season code and club code
  for basketball. A football club costs no extra request, nor a basketball club in a season already
  fetched; a new season code costs one. A EuroLeague arena missing from `VENUES` in
  [src/euroleague.ts](../src/euroleague.ts) shows no city, so its times read "at the venue" until its row
  is added. Then `node scripts/crests.ts` once: it fetches the crests that are missing from
  [assets/crests/](../assets/crests/) (UEFA by team id, the EuroLeague clubs endpoint by club code), scales
  each to 192 px and leaves the rest alone; the club's `crest` names its file. Without one the pages show
  the kit stripes. Never in the build, which keeps to its one request per source (#132).
- **A new season** of the club competitions: once the next season's games are published (July, as a rule),
  the season codes in [src/clubs.ts](../src/clubs.ts) move on (`E2026` to `E2027`, `U2026` to `U2027`), and
  the clubs and `COMPETITIONS` in [src/config.ts](../src/config.ts) are refreshed with them.

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
  live feeds, in order until one has games, and reads its `DTSTAMP`, the build time written into every event of a build. If it is older
  than 36 hours the check fails and the alert above fires. This is what catches a build that was
  disabled, skipped or stuck rather than one that failed.

To force a build: Actions → Build feeds → Run workflow, from main. To test that a failure reaches you: Actions →
Check feeds → Run workflow with `max_age_hours` set to `0`. Within a few minutes an issue "Check feeds
failed" appears and lands in your inbox; close it once seen, and the next real failure opens a new one.

### What we can see

The health signals we have today, in the order to check them:

- **Run status.** The Actions tab lists every run of "Build feeds" and "Check feeds" with its outcome,
  and a failed run is also an open `ops` issue.
- **Source answers.** The log of a "Build feeds" run has one line per request to a source: its host, the
  status and any `server`, `retry-after` or rate-limit header. When an answer is refused or unreadable,
  the error quotes its first 200 characters, so a bot-challenge page reads as one.
- **Freshness.** The log of a "Check feeds" run prints how many hours old the live feeds are.
- **Changes.** The page of each "Build feeds" run shows "What this build changed": the games added,
  changed (with the old and new value) and removed in each feed, compared with what scarf.fan served
  just before the run, and how many played games left the feeds.

- **Requests.** Cloudflare counts every request to scarf.fan, by path, browser or calendar app,
  country and status, 30 days back: dashboard → scarf.fan → Analytics → Traffic. How often the feeds
  are fetched is the closest thing to a subscriber count.

- **Feed fetches.** The Worker writes one row per `.ics` request to the Analytics Engine dataset
  `scarf_events`, which the Analytics Engine SQL API reads until the dashboard exists (#73). Staging writes to `scarf_events_staging`.

docs/observability.md is the plan for counting subscribers, visitors and subscribe clicks (#24).

## Known limits

- The UEFA endpoint, the FIBA page and EuroLeague Basketball's API (`api-live.euroleague.net`, open and
  keyless) are undocumented and can change without notice. UEFA's and FIBA's terms do not allow automated
  collection, and EuroLeague publishes none for its API, so this stays a small friends-only tool: the daily
  run, and a manual one, make one UEFA request for all football teams together, national and club, one FIBA
  request per basketball competition, and one EuroLeague request per season code (`E2026` for the
  EuroLeague, `U2026` for the EuroCup), parsed for every club in it. A run on a push to `main` reuses the
  answers the last run saved, however old, and asks only for what they don't cover: UEFA again for a new
  football team, FIBA for a new competition's page, EuroLeague for a new season code. Its run summary says
  how old the reused answers are.
- Calendar apps refresh subscribed feeds on their own schedule; Google Calendar can take a day. On a Mac,
  choose "Every day" for auto-refresh when subscribing; the default is reportedly weekly.
- Subscribing in Google Calendar only works in a computer browser, not in the phone app. On Android the
  `webcal:` buttons do nothing (no app handles them) and the Calendar app cannot subscribe to a feed, so
  the page script hides them for an Android browser and tells the fan to open the page on a computer and
  tap Google; the calendar then syncs to the phone. Not yet checked on a device (#112).
- Each timed game carries a reminder one hour before kickoff (`VALARM`); what happens next is up to the
  calendar app. iPhone Calendar stores it but never schedules it: in the iOS Simulator (iOS 17.5 and 18.0,
  subscription stored "On My iPhone", 30 October 2026) every game shows "Alert: None" and nothing fires,
  even with Event Alerts on. The fan-side fix is Default Alert Times › Events › 1 hour before in the
  Calendar settings, which then covers every timed event. Not tested on a real iPhone, an iCloud-stored
  subscription or a Mac. Google Calendar is believed to ignore embedded reminders but lets you set a
  notification for the whole calendar once, as the team page says. Outlook is unverified.
- Games with no announced time appear as all-day entries marked "time not announced".
- The `-alerts` feeds rely on the `known-games-…` entries under Actions → Caches. GitHub drops a cache
  unused for 7 days, and the daily run uses it every day. If it is lost anyway, or deleted to start afresh,
  a scheduled or push run fails (the alert opens the ops issue) rather than seed it again. Seeding afresh
  is a manual run of Build feeds: it announces nothing, the "New game" entries already in the alerts feeds
  disappear, and only games first seen from the next day on are announced.

Background on the data sources: [docs/research-2026-10-02.md](research-2026-10-02.md).
