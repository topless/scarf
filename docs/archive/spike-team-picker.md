# Spike: team picker and combined personal feed (#17)

A fan who follows more than one team should subscribe once, not once per team. Today every team
has its own static feed at `/{country}/{sport}.ics`, built daily by GitHub Actions and served by
GitHub Pages, which runs no code at request time. Two ways to offer one feed for several teams:

- **(a) Pre-built combinations.** The daily build also writes one static file per allowed
  combination of teams. The picker page only composes a file name.
- **(b) A tiny worker.** A Cloudflare Worker (or Deno Deploy) merges the selected static feeds when
  a calendar app asks for them. The picker page composes a query string.

Six teams exist on `main` (Greece and Spain in football and basketball, France and Germany in
basketball, #31); #35 (PR #37) brings Switzerland, England and Germany in football, nine teams. The page in
`reference/picker-page.html` works with either approach: the URL scheme is one constant at the top
of its script.

## (a) Pre-built combinations as static files

**URL scheme.** `/my/greece-basketball+greece-football.ics`. Slugs are `{country}-{sport}`, sorted
alphabetically, so one selection has exactly one address whatever order the fan clicked in. The
picker page lives at `/my/`, next to the files. Choosing one team yields the team's own feed, so
single feeds stay the only size-one files. `+` is legal in a path; if any calendar client turns out
to encode it, `_` is the fallback, decided before the first fan subscribes.

**How many files.** With a cap of three teams per feed (pairs plus triples):

| Teams | Pairs | Triples | Files (cap 3) | Files (cap 4) | No cap |
|---|---|---|---|---|---|
| 2 | 1 | 0 | 1 | 1 | 1 |
| 4 | 6 | 4 | 10 | 11 | 11 |
| 6 | 15 | 20 | 35 | 50 | 57 |
| 9 | 36 | 84 | 120 | 246 | 502 |
| 10 | 45 | 120 | 165 | 375 | 1,013 |
| 20 | 190 | 1,140 | 1,330 | 6,175 | 1,048,555 |

A game takes about 700 bytes of a feed, so a triple with ten games per team is about 21 KB, and even
1,330 files stay under 30 MB on a host that allows 1 GB. The cap
is a product limit ("fans, not fanatics": three teams is a fan), not a technical one; it can go to
four at any point without moving a single existing file.

**Infrastructure.** None. Same workflow, same `dist/`, same Pages deploy. The combinations are
rendered from the games already in memory, so the rule of one request per source per run is
untouched, and a failed build leaves yesterday's combinations online like everything else.

**When a team is added.** The next build writes the new combinations; no existing file moves. When
a team is removed its combinations go away, which is what already happens to its own feed. A slug
can never be renamed, which is already the rule for `/{country}/{sport}.ics`.

## (b) A worker that merges at request time

**URL scheme.** `/my.ics?t=greece-basketball,greece-football`, slugs sorted the same way so the
edge cache sees one key per selection.

**What it does.** Validates each slug against `^[a-z]+-[a-z]+$`, fetches `/{country}/{sport}.ics`
for each from our own published site (never from UEFA or FIBA), copies every `VEVENT` block
verbatim apart from the `SUMMARY` line, and wraps them in a new `VCALENDAR` header. A slug that
404s on our site is a 404 for the fan. A hundred lines of TypeScript, no library: our feeds carry
no `VTIMEZONE` blocks (times are UTC, placeholders are dates), so there is nothing to deduplicate,
and the only parsing is unfolding RFC 5545 lines before touching `SUMMARY`.

**Account.** `scarf.fan` is registered at Cloudflare and its DNS lives there (#44), so the account
exists; the worker is a new service on it. Cloudflare Workers free tier allows about 100,000
requests a day; Deno Deploy's free tier about a million a month (figures as of writing; check at
sign-up). A hundred subscribers whose apps poll every hour are 2,400 requests a day. Cloudflare is
the better fit because the domain is already there and #24 proposes putting Cloudflare in front of
the site; Deno Deploy would be a second vendor for no gain.

**Caching.** The merged response carries `Cache-Control: public, max-age=3600`; the subrequests to
our own feeds use the same one-hour TTL, and the merged body is stored in the edge cache keyed on
the sorted query. The feeds change once a day and advertise a 12-hour refresh interval, so an hour
of staleness is invisible. Worst case per edge location: 24 fetches of each team feed a day.

**If it is down.** Calendar apps keep the last copy they fetched and retry on their own schedule;
Apple Calendar eventually shows a warning triangle on the calendar, Google shows nothing. New games
and kickoff times stop arriving until it is back. If the account lapses or the route is lost, every
personal subscription is dead for good while every team feed keeps working. Hosting the route on our
own domain limits the damage to "re-point the route", so the worker should never be published on a
`workers.dev` host.

## Both approaches

- **UIDs.** Unchanged either way. (a) renders the same `Game` objects with the same `uefa-…` and
  `fiba-…` ids; (b) copies the `UID` line as is. Either way an event in a personal feed and in the
  team feed is the same event, so a fan who subscribes to both sees it twice in two calendars, which
  is what two subscriptions mean and needs no fix.
- **The ` · sport` suffix** (`Greece vs Serbia · football`, per the spec). In (a) the feed renderer
  takes a flag and appends the team's sport to every summary; in (b) the worker rewrites `SUMMARY`
  with the sport taken from the slug. Proposed rules, the same in both: the suffix goes right after
  the team names in every summary of a combined feed, including placeholders
  (`Greece vs Ukraine · basketball · time not announced`) and alert events
  (`Tickets on sale · Greece vs Serbia · football`), and it is applied even when every selected team
  plays the same sport, so a feed never changes shape when a fan swaps a team. The reminder text and
  the description stay as they are; each event keeps its own team's page in `URL` and in the footer.
- **Calendar name and colour.** `X-WR-CALNAME:My teams · scarf`; the fan can rename it in their app,
  and the description names the teams: `Every game of Greece football and Greece basketball:
  kickoff, venue, TV, tickets. Kept up to date by scarf.` Colour: Terrace red `#D7263D`, the one
  colour the brand owns and no team does; it reads as a deliberate colour in every calendar app,
  where Ink `#17171C` would look like a default. Alternative if red feels like a claim: Ink.
- **If the choice changes later.** From (a) to (b): nothing breaks. The files keep being built (they
  cost nothing) or, once Cloudflare fronts the domain, the worker takes over the `/my/*` paths and
  answers the same addresses. From (b) to (a): every subscription points at `/my.ics?t=…`, and a
  static host cannot vary a response on its query string, so a worker or a Cloudflare redirect rule
  must keep answering that URL with a 301 for as long as anyone is subscribed; calendar apps follow
  redirects but never update the stored address. (a) is the reversible choice.
- **Custom domain.** The site is served at `https://scarf.fan` (#44), and both print absolute URLs
  from the build's `SITE_URL` the way the team pages do. (a) works there as soon as it ships. (b)
  can share the feeds' host only with the Cloudflare proxy turned on for `scarf.fan`; today every
  record is "DNS only" so GitHub can issue the certificate (docs/development.md, "One-time setup").
- **Observability (#24).** Once Cloudflare is in front, both show up in the zone analytics with no
  script and no cookie: (a) as requests per `/my/…` path, (b) as requests per query. Either way a
  one-of-a-kind combination is one fan's calendar polling, which is worth a line in the
  "What we can see" section of docs/development.md. Without Cloudflare, (a) is as blind as the
  rest of the site today and (b) has the Workers dashboard (requests, errors, CPU time).

## Recommendation

**Go with (a), pre-built combinations, cap of three teams.** At six teams it is 35 files written
from data already in memory (120 at nine), no new service, no second host, no new way to be down,
and the one choice that can be reversed. The worker is a **no-go for now**: it buys an uncapped
selection at the price of a new service, the Cloudflare proxy in front of the site, and an address
that can never be retired. Reopen it when
Cloudflare fronts the domain for #24 anyway, if the cap has bitten by then; the picker page, the
suffix rules and the tests carry over unchanged.

**Decisions that are Chris's**

1. Approach: (a) now, or (b) with a Cloudflare Worker and the proxy turned on for `scarf.fan`.
2. The cap: three teams per feed (four costs 15 more files at six teams, 126 more at nine).
3. The paths: picker at `/my/`, feeds at `/my/{slug}+{slug}.ics` with sorted slugs, `+` as the
   separator. Frozen the moment the first fan subscribes.
4. Calendar name `My teams · scarf` and colour Terrace red (or Ink).
5. The suffix rules above: always on, including placeholders and alert events.
6. Whether the landing page and each team page link to the picker ("Follow more than one team").

## What the build and feed code need either way

- `src/config.ts`: a `slug(team)` helper (`{country}-{sport}`) next to `feedPath`, used by the
  build, the picker page and the tests, so the URL rule exists in one place.
- `src/ics.ts`: `toIcs` takes a feed descriptor (name, description, colour, `sportSuffix` flag)
  and a list of `{ team, game }` pairs instead of one team, so a combined feed is the same function
  with more pairs. `UID`, `URL`, footer and reminder stay per event.
- `src/build.ts`: after the per-team loop, enumerate sorted combinations of size 2 to the cap, write
  `dist/my/{slugs}.ics` from the games already fetched, and write `dist/my/index.html`. No fetches.
- `src/page.ts`: port `reference/picker-page.html`; the team list and the URL scheme are emitted
  into the page script from config and the site address from the build's `SITE_URL`, and the
  subscribe panel is shared with the
  team page. A link to `/my/` from the landing page and the "Other teams" section.
- Tests: a combined feed keeps every `UID` from its team feeds; every summary ends in ` · {sport}`
  and the voice checks still pass; the build writes exactly C(n,2)+C(n,3) files for n teams; the
  path the page script builds for a selection equals the path the build wrote (one rule, two
  callers); a single team selects the team's own feed path.
- Approach (b) instead: `worker/` with the fetch handler and its config, the same tests run against
  the worker's output, and the picker constant flips to the query form. The build is untouched.
