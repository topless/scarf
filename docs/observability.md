# Observability

How we see whether scarf is healthy and whether fans use it: which calendars follow which team, who
visits, which subscribe buttons get pressed, and what each daily build changed. Decided with Chris on
2026-10-30. Steps #70–#73 and #43, tracked in #24.

## Decisions

- **First-party, cookie-free counting.** A small script on our own pages may report to our own
  Worker. No cookies, no browser storage, no stored IP addresses, no third-party trackers. The pages
  carry no notice about it; one separate privacy page describes it (#78).
- **Hosting moves to Cloudflare Workers** with static assets, on the free plan. The build stays in
  GitHub Actions.
- **Measure first.** A week of Cloudflare's built-in request counts comes before any counting code.
- **Four signals:** feed subscribers, page visitors, subscribe clicks, build and data changes.

## Why we see nothing today

GitHub Pages keeps no access logs, and scarf.fan's records in Cloudflare are DNS-only: Cloudflare
answers the lookup, then the visitor talks to GitHub. From 22 to 28 October Cloudflare answered about
7,000 address lookups for scarf.fan and saw one HTTP request.

## Signals

| Signal | Questions | Recorded by | Read in |
|---|---|---|---|
| Feed subscribers | Calendars per team and app, refresh rate, how long a changed game takes to arrive | The Worker, on each `.ics` request | Dashboard |
| Page visitors | Views and visitors per page, countries, referring sites | The page script, on load | Dashboard |
| Subscribe clicks | Which button on which team page, with or without alerts | The page script, on click | Dashboard |
| Build and data changes | Did the build run, did each source answer, which games changed | The build | The run's page on GitHub |

The first three are rows in one Workers Analytics Engine dataset, `scarf_events`.

## Hosting (#43)

- `wrangler.jsonc` with `assets.directory: "dist"`. The Worker runs first only on the feeds
  (`run_worker_first: ["/*.ics"]`; check the glob matches `/greece/football.ics`). Every other file is
  served without it, and a path with no file, such as `/e`, reaches the Worker anyway.
- `publish.yml` builds as today and deploys with `wrangler deploy`. `SITE_URL` becomes
  `https://scarf.fan`.
- No `_headers` file. Wrangler sets `text/calendar` from the file extension, and the default cache
  header (recheck every time, with an ETag) suits feeds. `_headers` rules would not apply to feeds
  anyway once they pass through the Worker.
- Rollout: serve from `workers.dev` next to GitHub Pages for a few daily builds, then move in one step:
  delete the nine DNS-only records, attach `scarf.fan` as the Worker's custom domain, redirect `www`
  to the apex. At a quiet hour; calendar apps retry a failed refresh.
- GitHub Pages and its custom-domain setting stay, so `topless.github.io/scarf/…` keeps redirecting.
  Unverified whether GitHub keeps redirecting once scarf.fan points elsewhere: check right after.

**Measure first.** Once scarf.fan runs on Workers, Cloudflare's built-in analytics count every request
by path, User-Agent, country and status: free, no code, 30 days back. Read a week of feed requests per
day before #71 turns the Worker on. The feeds already ask calendars to refresh every 12 hours
(`REFRESH-INTERVAL` and `X-PUBLISHED-TTL`, docs/calendar-event-spec.md), so a device that listens
makes about two requests per feed a day. Workers Free allows 100,000 Worker requests a day; reaching
that takes tens of thousands of subscriptions, or one misbehaving client. Past it, feeds answer 429
until midnight UTC and calendars keep the games they have, so a change arrives a day late. If the
week's numbers come anywhere near, add the free plan's one rate-limiting rule or move to Workers Paid
(US$5 a month) before #71.

## Feed subscribers (#71)

The Worker passes each feed request to the static files and returns the response untouched. Then
(`ctx.waitUntil`) it writes one row: path, calendar app family, country, status (200, or 304 when the
calendar already had the file), feed version, daily visitor hash, and the raw User-Agent only when the
family is unknown. A failed write never changes what the calendar gets.

**Counting.** Apps that fetch from the device (Apple Calendar, desktop Outlook, Thunderbird, Android
sync apps) give about one visitor hash per device per day. Google Calendar and Outlook.com fetch from
their own servers, as far as we know once per feed for all their users, so theirs is a floor, not a
count. Refresh rate is fetches per hash per day.

**Version.** Every build restamps `DTSTAMP`, so a feed's bytes change daily even when no game did. The
build writes `dist/versions.json`: each feed's path and a short hash of the feed without its `DTSTAMP`
lines. The Worker reads it once per instance and logs the feed's version; files and Worker deploy
together, so it is never stale. The share of today's devices on the newest version shows how long a
changed kickoff takes to reach calendars.

## Page visitors and subscribe clicks (#72)

The page script sends `navigator.sendBeacon('/e', …)`:

- on load, `{kind: 'view', path, ref}`, where `ref` is the referring host only;
- on a subscribe button, `{kind: 'subscribe', path, app, alerts}`, with `app` one of `apple`,
  `google`, `outlook`, `copy`.

Nothing is sent under Global Privacy Control or Do Not Track, and links never wait for the beacon.
`/e` keeps only known kinds and apps, paths that are our pages, and short fields; writes them with the
same visitor hash as the feeds; and answers 204 either way.

Why not a ready-made tool: Cloudflare Web Analytics can't count clicks, and a hosted tracker would
receive every fan's address and fill its quota with calendar polling. Only the Worker writes events,
so the destination can change in one place.

## Build and data changes (#70)

Already in place: a failed build or a stale feed opens an `ops` issue. New: each build writes a
summary on its run page. Per source, whether it answered and how many games it gave per team. Per
feed, games added, changed ("Greece vs Georgia: kickoff 20:45 → 21:45 in Athens") and removed,
compared by UID with the live feed on scarf.fan, ignoring `DTSTAMP`. That is our own site, so the
one-request-per-source rule is untouched. This step does not depend on the move.

## The view (#73)

A Grafana Cloud dashboard on the free tier reads `scarf_events` through the Analytics Engine SQL API
with a read-only token. Panels: subscribers per team by app, with Google and Outlook.com apart as "at
least"; refresh rate per app; update reach; page views, visitors, referring sites and countries;
subscribe clicks per team and app, and per hundred page views; feed requests per day against the free
plan's 100,000. Its JSON lives in the repository, and "What we can see" in docs/development.md lists
every signal. Analytics Engine keeps three months.

## Privacy

- No cookies, no browser storage, no id that lasts longer than a day.
- The visitor hash is SHA-256 of a daily key, the IP address and the User-Agent, cut to 16 hex
  characters. The daily key is an HMAC of the date with a Worker secret, so days can't be joined.
  Shortcut: the secret does not rotate, so whoever holds it could test a guessed address against a
  past day; a one-day key that is then deleted closes that.
- IP addresses are never stored; country is the finest location.
- No third-party requests: since #100 the pages load their fonts from scarf.fan too.

## What we won't see

- How many Google Calendar or Outlook.com users follow a feed.
- Whether a fetch was a subscription or a one-off import; a hash seen once is probably an import.
- Several people behind one shared calendar: we count calendars, not fans.

## Order

#70 now, then #43 and a week of Cloudflare's built-in numbers, then #71 together with the privacy
page (#78), #72, and #73 once a week of data exists.
