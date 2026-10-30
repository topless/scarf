# Observability

How we see whether scarf is healthy and whether fans use it: who visits, which calendars follow which
team, which subscribe buttons get pressed, and what each daily build changed. Decided with Chris on
2026-10-30. The steps are #70–#73 and #43, tracked in #24.

## Decisions

- **Counting is first-party and cookie-free.** A small script on our own pages is allowed. Cookies,
  local storage, per-person ids, stored IP addresses and third-party trackers are not. CLAUDE.md
  says so under "Don't".
- **Hosting moves to Cloudflare Workers** with static assets; the build stays in GitHub Actions. This
  replaces the Cloudflare Pages plan in #43: Cloudflare's own migration guide now points static sites
  at Workers, and a Worker can run code on chosen paths, which is how feed fetches get counted.
- **Four signals**, in this order: feed subscribers, page visitors, subscribe clicks, build and data
  changes.

## Why we see nothing today

GitHub Pages keeps no access logs, and the scarf.fan records in Cloudflare are DNS-only: Cloudflare
answers the lookup, then the browser or calendar app talks to GitHub directly. From 22 to 28 October
Cloudflare answered about 4,500 IPv4 and 2,600 IPv6 lookups for scarf.fan, more than any other domain
on the account, and saw one HTTP request. A lookup says someone resolved the name, not who, or how
often they fetch.

## The four signals

| Signal | Questions | Recorded by | Read in |
|---|---|---|---|
| Feed subscribers | How many calendars follow each team, in which apps? How often do they refresh? How long until a changed game reaches them? | The Worker, on every `.ics` request | Dashboard |
| Page visitors | Views and visitors per page per day, countries, referring sites | The page script, once per page view | Dashboard |
| Subscribe clicks | Which button (Apple, Google, Outlook, copy) on which team page, with or without alerts | The page script, on click | Dashboard |
| Build and data changes | Did today's build run? Did each source answer? Which games were added, changed or removed? | The build | The run's page on GitHub, `ops` issues |

The first three land in one Workers Analytics Engine dataset, `scarf_events`, one row per event.

## Hosting: Workers with static assets (#43)

- `wrangler.jsonc` at the root with `assets.directory: "dist"`. The Worker runs first only on the
  feeds and the event endpoint (`run_worker_first: ["/*.ics", "/e"]`); every other request is a static
  asset that never touches the Worker, free and unlimited.
- `publish.yml` builds and tests as today; `wrangler deploy` replaces the Pages upload and deploy
  steps, with one API token in the repository secrets. `SITE_URL` becomes `https://scarf.fan`.
- The build writes `dist/_headers`: `Content-Type: text/calendar; charset=utf-8` and a cache time on
  `.ics` files, plus each feed's `X-Scarf-Version` (below). GitHub Pages allows neither.
- Rollout as #43 planned: serve from the `workers.dev` address next to GitHub Pages for a few daily
  builds, then move scarf.fan in one step. Delete the nine DNS-only records, attach `scarf.fan` as the
  Worker's custom domain (Cloudflare creates the record and the certificate), and send `www` to the
  apex with a redirect rule. Do it at a quiet hour; calendar apps retry a failed refresh.
- Leave the GitHub Pages site and its custom-domain setting in place, so `topless.github.io/scarf/…`
  keeps redirecting for anyone who subscribed before 22 October. Unverified: whether GitHub keeps that
  redirect once scarf.fan no longer points at it. Check right after the move.
- The repository going private no longer takes the feeds offline (#34).

## Feed subscribers (#71)

The Worker hands every feed request to the static assets and returns that response untouched. After
the response is sent (`ctx.waitUntil`) it writes one data point:

| Field | Value |
|---|---|
| `kind` | `feed` |
| `path` | e.g. `/greece/football.ics` |
| `client` | calendar app family, from the User-Agent |
| `country` | `request.cf.country` |
| `status` | 200, or 304 when the calendar already had this file |
| `version` | the feed's `X-Scarf-Version` |
| `visitor` | the daily visitor hash (see Privacy) |
| `ua` | the raw User-Agent, only when `client` is `other`, so the family table can grow |

Writing fails open: an error, or a missing binding, never changes what the calendar receives.

**Two kinds of calendar app**, counted differently:

- *Fetching from the device*: Apple Calendar on iPhone and Mac, Outlook on the desktop, Thunderbird,
  Android sync apps such as ICSx⁵. One visitor hash per day is roughly one device. A phone that
  changes network during the day counts more than once; several people behind one address count once.
- *Fetching from the provider's servers*: Google Calendar and Outlook.com, as far as we know once per
  feed for all their users, possibly iCloud too for calendars subscribed there. They show as a handful
  of fetches whatever the number of fans behind them: a floor, not a count.

The User-Agent strings per family are not pinned yet; the first week of `other` rows fills the table.

**Refresh rate.** Fetches per visitor hash per day, per app family.

**Update reach.** Every build stamps every event's `DTSTAMP` with the build time, so a feed's bytes
change daily even when no game did, and every daily refresh downloads the whole file. To see a real
change travel, the build writes a version per feed: a short hash of the feed with its `DTSTAMP` lines
left out, served as `X-Scarf-Version` and logged by the Worker. The share of today's device fetchers
already on the newest version then shows how many hours a changed kickoff takes to reach calendars.

**Budget.** The free plan allows 100,000 Worker requests a day. Past that, Cloudflare answers the
Worker's paths with 429 instead of the file, so the dashboard shows feed requests per day against the
limit; at half of it we move to Workers Paid ($5 a month) before fans notice. Analytics Engine is not
billed yet; its published free allowance is 100,000 writes a day.

## Page visitors and subscribe clicks (#72)

A few lines join the existing page script on the landing and team pages:

- On load, `navigator.sendBeacon('/e', …)` with `{kind: 'view', path, ref}`. `ref` is the referring
  host only (`whatsapp.com`, `google.com`), never the full address.
- On a subscribe button, `{kind: 'subscribe', path, app, alerts}`: `app` is `apple`, `google`,
  `outlook` or `copy`, `alerts` whether the alerts box was ticked. The link works exactly as before
  and does not wait for the beacon.
- Nothing is sent when the browser asks not to be tracked (Global Privacy Control or Do Not Track).

`/e` checks what arrives before writing: a known `kind` and `app`, a `path` that is one of our pages,
short fields. It drops everything else and answers 204 either way. It writes the same daily visitor
hash as the feeds, so visitors per day and subscribers per day are counted the same way.

The footer gets one line: "scarf counts visits and calendar refreshes without cookies or personal
data."

**Why not Cloudflare Web Analytics or a hosted tracker.** Web Analytics is free and needs no code, but
it records no custom events, so it can't count subscribe clicks, and it would be a second place to
look. A hosted service (Plausible, GoatCounter and the like) brings a ready dashboard, but calendar
polling is a steady stream of machine requests that would fill a paid event quota, and every fan's
address would reach a third party. Only the Worker and `/e` write events, so if the dashboard below
turns into a chore, the destination changes in one place.

## Build and data changes (#70)

Already in place: a failed build or a stale feed opens an `ops` issue (`alert.yml`,
`check-feeds.yml`), and the Actions tab lists every run.

New: each build writes a summary on its run page (`$GITHUB_STEP_SUMMARY`):

- per source, whether it answered and how many games it gave per team;
- per feed, games added, changed and removed since the live feed, with the fields that changed
  ("Greece vs Georgia: kickoff 20:45 → 21:45 in Athens"). The build reads the live feeds from
  scarf.fan before deploying and compares events by UID, ignoring `DTSTAMP`. That is our own site, so
  the one-request-per-source rule is untouched.

This step does not depend on the move to Workers and can start first.

## The view (#73)

One Grafana Cloud dashboard on the free tier, reading `scarf_events` through the Analytics Engine SQL
API with the ClickHouse data source Cloudflare recommends and a read-only API token:

1. Subscribers per team per day, stacked by app; server-side fetchers apart, as "at least".
2. Fetches per app per day, and the refresh interval.
3. Update reach: share of device fetchers on each feed's newest version, by hours since it appeared.
4. Page views and visitors per page per day; referring hosts; countries.
5. Subscribe clicks per team and app, the share with alerts, clicks per hundred team-page views.
6. Feed requests per day against the free-plan limit.

The dashboard's JSON lives in the repository so it can be rebuilt, and the README's "What we can see"
lists every signal and where to read it. Build changes stay on the run page.

Analytics Engine keeps three months, enough for a qualifying campaign. Year-on-year numbers would need
a monthly roll-up stored elsewhere; not planned.

## Privacy

- No cookies, no local or session storage, no per-person id, no fingerprint beyond the daily visitor
  hash.
- The visitor hash is SHA-256 of a daily key, the IP address and the User-Agent, cut to 16 hex
  characters. The daily key is an HMAC of the date with a Worker secret, so hashes from different days
  can't be joined. Shortcut: the secret does not rotate, so whoever holds it could test a guessed
  address against a past day; a key kept for one day and then deleted closes that. Upgrade if the data
  ever leaves the dashboard.
- IP addresses are never written. Country comes from Cloudflare, nothing finer.
- No third party receives a request about a fan, with one exception today: the pages load Google
  Fonts from Google's servers, which hands every visitor's address to Google. Serving the two fonts
  from scarf.fan would close it (the share images already bundle them in `fonts/`); worth its own
  issue.
- The dashboard shows aggregates only; Analytics Engine deletes rows after three months.

## What we still won't see

- How many Google Calendar or Outlook.com users follow a feed. Only a per-subscription token in the
  subscribe address (`/greece/football.ics?s=…`, path unchanged) would count them, and that is a
  per-person id that needs its own decision under the rules above. Not planned.
- Whether a single fetch was a subscription or a one-off import. A visitor hash seen once and never
  again is probably an import.
- Fans who see the games in a shared family calendar: we count calendars, not people.

## Order

1. #70 build summary: no dependency, can start now.
2. #43 move to Workers.
3. #71 feed counting, then #72 page views and clicks.
4. #73 dashboard, once a week of data exists, with the README update.
