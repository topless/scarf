# Spike: staying welcome at UEFA and FIBA (#114)

**Date.** 1 November 2026. The figures come from the Actions history and the code as of that day. The
spike sent no request to either source; their robots files were read from the Wayback archive.

**Scope.** The card asks how scarf avoids being blacklisted, or hitting a limit, when it fetches from
UEFA, FIBA and whatever source comes next. This spike says what we send today, what could get it
refused, how we would notice, and the smallest changes that lower the risk. Out of scope: new sources
(#38, #113, #115) except where they change the picture, and the sources' terms, which no code answers.

## Recommendation

**We are already about as quiet as a client can be, so what is left is small.** The daily run sends one
request to UEFA, for every football team at once, and one page request to FIBA per basketball
competition, one today. Since #99 a push to `main` reuses the day's answers and sends nothing. That is
about 30 requests a month to each source, with a User-Agent that names us, no retry and a 30-second
timeout. No rate limit trips at that volume: uefa.com's own fixtures pages call the same endpoint
for every visitor. What can still refuse us is a bot rule against datacenter addresses (GitHub's runners
are shared Azure addresses, the same ones every other Actions user has) or a person reading the logs.
Neither cares about our rate, and both have let every request through since 3 October.

Two changes are worth making, and neither adds a request:

1. **A push never asks a source.** A push reuses the saved answers only while they are less than a day
   old. When the daily run fails or starts late, the pushes that follow ask again: up to 13 a day in the
   history. A source that has just refused us then sees a burst from the same address, which is how a
   soft block becomes a hard one. Drop the age condition in `reusable()` (src/answers.ts): a push uses
   whatever the last run saved and asks only for what it does not cover, a new football team or a new
   competition. The run summary already prints how old a reused answer is, so staleness stays visible.
2. **Say what the source answered when the build fails.** A refusal reaches Chris today as
   "403 Forbidden for <url>", one click into the run, which is enough. A soft refusal, a 200 carrying a
   challenge page, would not: UEFA's would fail as a JSON syntax error, FIBA's as "page format changed".
   Print each answer's status and its `server`, `retry-after` and rate-limit headers in the step log,
   and the first 200 characters of the body when parsing fails. The next daily run then also tells us
   which CDN fronts each source and whether a rate-limit header exists at all, without asking anything new.

## What we send today

| | UEFA | FIBA |
|---|---|---|
| Request | `match.uefa.com/v5/matches?teamId=…`, one call for all 7 football teams, `limit=500` | `fiba.basketball/en/events/<event>/games`, one page per competition, one today |
| When | the daily run (cron 04:23 UTC, which GitHub has started between 08:57 and 11:22 so far), a manual run, `npm run build` on a developer's machine | the same, with a 5 s pause between pages once there are two |
| Never | a push to `main` within a day of the last run; `npm run build:fixtures` | the same |
| Headers | `User-Agent: scarf/0.1 (personal fixture calendar)`, 30 s timeout, no retry | the same |
| On failure | the build fails, the last `dist/` stays online, an "ops" issue is opened or commented | the same |
| robots.txt | `match.uefa.com` has none (404); uefa.com's disallows nothing we read | disallows only the login routes; the games pages are open |
| Since 3 October | every request answered | one 404 on 30 October, on two pushes a minute apart, gone two hours later |

## How a block would show

- **Hard: 403, 429 or 503.** The build fails with the status and the URL in the log, the last site stays
  up, the "ops" issue says which run. We don't read `Retry-After`: a retry is a second request, and at one
  a day the next daily run is the backoff.
- **Soft: a 200 with a challenge page.** The build fails too, but blames the format (change 2 above).
- **Silent: UEFA answering fewer matches than it has.** `fetchUefaMatches` fails at 500, where paging,
  a second request, would be needed; a quieter cap would drop the latest matches without a word. The
  match count in the run summary is the only tell. The request-free lever, if the count climbs, is a
  shorter `toDate` window; today it runs to the end of the year after next.

## Where the risk really is

Not the rate. UEFA's terms (section 6.2) forbid automated collection, FIBA's forbid redistribution, and
docs/development.md "Known limits" already draws the conclusion: a small friends-only tool. Code does
not change that. The one lever that touches it is the User-Agent: the convention for a bot that wants
to be left alone is to name a contact, `scarf/0.1 (+https://scarf.fan)`, and that also hands the site's
address to the operator. Chris's call, below.

## Growth

- Women's and under-21 sides (#16): UEFA stays one call if the endpoint takes those team ids, which the
  first such team will show; FIBA grows by one page per competition.
- Clubs (#113, #115): a third site, under the same rules, one page per competition with a pause between
  pages and a build that fails closed. Five pages a day is still nothing.
- The rule that keeps all this true is already in CLAUDE.md: one request per source per run, never more.

## Follow-up issues

Chris had both opened on 1 November 2026: #126 and #127.

1. **A push never asks a source (#126).** `reusable()` in src/answers.ts loses the 24-hour condition; the assertions on age in
   test/answers.test.ts; the "Known limits" sentence in docs/development.md and
   the comments in .github/workflows/publish.yml and src/build.ts that say "less than a day old".
2. **Log what each source answered (#127).** `fetchText` in src/game.ts prints status and the headers named
   above; the parse errors in src/uefa.ts and src/fiba.ts carry the body's first 200 characters; one
   test for the message.

**Decisions that are Chris's**

1. Open the two follow-ups, or take them as one small PR.
1. A contact in the User-Agent, `scarf/0.1 (+https://scarf.fan)`: the polite-bot convention, and it
   names the site to the sources.
2. A guard on `npm run build` outside CI, refusing unless `CI` or an opt-in variable is set, so no
   developer machine or agent asks a source by accident; `npm run build:fixtures` is the check build.
   Two lines, and a change of local habit.

## When to revisit

- A 403 or 429 appears: do nothing for a day; the daily run is the retry. Two in a row point at the
  address, and the exits are the build on Cloudflare's network (options B and C in
  [spike-build-platform.md](archive/spike-build-platform.md)) or FIFA's API for football (#38).
- The UEFA match count in the run summary passes 400.
- A third source arrives (#113): the same rules, written once for the new site.

## Looked at, not worth it now

- **Retries, `Retry-After`, exponential backoff.** Every retry is a request, and at one a day the next
  day is the backoff.
- **Jitter on the schedule.** GitHub already starts the run four to seven hours late, at random.
- **Conditional requests (`ETag`).** They save bytes, not requests; a 304 is still a line in the source's log.
- **Rotating addresses or proxies.** That is evading a block, not avoiding one, and it turns a friendly
  operator into an unfriendly one.
- **Reading robots.txt or the terms from the build.** A second request per source for a file that
  changes once a year. Read by hand instead, as this spike did.
- **A fallback source on failure.** A bad day would then hit two sources.
