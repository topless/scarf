# CLAUDE.md · scarf

scarf publishes subscribable calendar feeds (.ics) for the national teams fans follow: kickoff,
venue, TV, tickets, a reminder an hour before. It also builds static pages: one per team, one per
country, the landing page and How it works. Static output, rebuilt daily by GitHub Actions, served
by a Cloudflare Worker at scarf.fan (docs/development.md). The identity, the brand line and the
motto: docs/brand.md.

## Stack and commands

- Node 22.18+, TypeScript. `npm install` · `npm test` · `npm run build:fixtures` (writes `dist/`
  from the test fixtures and asks no source: the build to check a change with) · `npm run build`
  (asks UEFA and FIBA: the daily job's build, not a check).
- Sources: UEFA match API (football), FIBA games page (basketball). Both undocumented; **one request
  per source per run**, never more: UEFA takes every team id in one call, and a FIBA page is fetched
  once per competition and parsed for every team in it. If a fetch fails or the shape changes, fail
  the build. The last published `dist/` stays online.
- Manual data: `src/config.ts` (teams, ids, TV, ticket URLs), `src/manual.ts` (per-game overrides
  keyed by source id, e.g. `fiba-127107`). Hand-entered time/venue yield to the official source.

## Paths (frozen: fans' subscriptions point here)

- `/{country}/{sport}.ics`: one feed per team, e.g. `/greece/football.ics`, `/greece/basketball.ics`.
- `/{country}/{sport}-alerts.ics`: the same feed plus a "New game" entry per newly announced game.
- `/{country}/{sport}/`: the team page, named in every event's footer.
- Every other page (`/`, `/{country}/`, `/how-it-works/`, `/kit/`) may move, with a redirect.
  The full list: docs/development.md, Paths.

## ICS rules (every field and the exact copy: docs/calendar-event-spec.md)

- UIDs come from source ids and never change. Updates must land in place, never duplicate.
- `SUMMARY`: `Home vs Away` as the federation lists it; no competition, sport or emoji.
  All-day placeholder while kickoff is unknown: `Home vs Away · time not announced`.
- Each sport's own words, the same in the feed as on its page (`WORDS` in `src/page.ts`): kickoff,
  kicks off, stadium for football; tip-off, tips off, arena for basketball.

## Voice (applies to every string a fan can read)

- Cheerful about the team, the players and the game; never preachy.
- Sentence case. No exclamation marks, no emoji, no "notification" (say reminder/nudge), no TBA/TBC
  (say "time not announced"), no "don't miss out".
- No em dashes: use `·`, a comma, a colon or a full stop.
- "We" is the team, "you" is the fan: "We play Serbia on Monday."
- A time always names its city: "21:45 in Volos". Calendars convert; copy must not pretend to.

## Brand (docs/brand.md, values in `assets/brand-tokens.css`)

- Team stripes carry the colour; the brand itself stays neutral. Colours, type, the mark and the
  components are in the spec, not here.

## Don't

- Don't add a request to a source "just to check". Don't scrape anything new without an issue first.
- Don't change feed paths or UIDs. Don't print the secondary domain anywhere: scarf.fan is the only
  address fans see, and a second domain, if one is ever bought, only forwards to it.
- Don't add accounts, logins, cookies or third-party tracking to the static site. First-party,
  cookie-free counting is fine, within docs/observability.md's privacy rules.
