# CLAUDE.md — scarf

scarf publishes subscribable calendar feeds (.ics) for the national teams fans follow — kickoff,
venue, TV, tickets, a reminder an hour before — plus one static page per team and a landing page.
Static output, rebuilt daily by GitHub Actions, served by GitHub Pages. Brand line: "Your colours,
in your calendar." Motto: "Wrapped up in the game."

## Stack and commands

- Node 22.18+, TypeScript. `npm install` · `npm test` · `npm run build` (writes `dist/`).
- Sources: UEFA match API (football), FIBA games page (basketball). Both undocumented; **one request
  per source per run**, never more: UEFA takes every team id in one call, and a FIBA page is fetched
  once per competition and parsed for every team in it. If a fetch fails or the shape changes, fail
  the build — the last published `dist/` stays online.
- Manual data: `src/config.ts` (teams, ids, TV, ticket URLs), `src/manual.ts` (per-game overrides
  keyed by source id, e.g. `fiba-127107`). Hand-entered time/venue yield to the official source.

## Workflow

- Every change request, however small, goes through the `feature` skill (`/feature <request or #issue>`,
  `.claude/skills/feature/SKILL.md`): issue with acceptance criteria → plan as a comment on the issue →
  branch → implement with tests → review (`scripts/preflight.sh`, `/code-review`) → verify each criterion
  → PR that closes the issue → check the deploy. No PR without an issue; merging is Chris's call.
- Issue and PR shapes live in `.github/ISSUE_TEMPLATE/feature.md` and `.github/pull_request_template.md`.

## Paths (frozen — fans' subscriptions point here)

- `/{country}/{sport}.ics` — one feed per team, e.g. `/greece/football.ics`, `/greece/basketball.ics`.
- `/{country}/{sport}-alerts.ics` — the same feed plus a "New game" entry per newly announced game.
- `/{country}/{sport}/` — team page; `/{country}/{sport}/share.png` — 1200×630 share image.
- `/` — landing listing every team. Served at `https://scarf.fan`: the custom domain is set under
  Pages in the repo settings, DNS at Cloudflare. Actions deploys need no `/CNAME` file.

## ICS rules (see docs/calendar-event-spec.md for exact copy)

- UIDs come from source ids and never change. Updates must land in place, never duplicate.
- `SUMMARY`: `Home vs Away` as the federation lists it; no competition, sport or emoji.
  All-day placeholder while kickoff is unknown: `Home vs Away · time not announced`.
- Each sport's own words, the same in the feed as on its page (`WORDS` in `src/page.ts`): kickoff,
  kicks off, stadium for football; tip-off, tips off, arena for basketball.
- `DESCRIPTION`: competition · "Kickoff HH:MM in City" (or "Tip-off …") · "TV: …" · "Tickets: …" · blank line ·
  "Kept up to date by scarf · {canonical}/{country}/{sport}". Six lines max.
- `LOCATION`: full venue, city, country. `DURATION`: 2 h. `URL`: ticket link while on sale, else team page.
- `VALARM` 60 min before, description `"{Home} vs {Away} kicks off in an hour · {TV}"` ("tips off" for basketball).
- Header: `X-WR-CALNAME:{Team} {sport} · scarf`, `X-APPLE-CALENDAR-COLOR` = team's first stripe colour.

## Voice (applies to every string a fan can read)

- Cheerful about the team, the players and the game; never preachy.
- Sentence case. No exclamation marks, no emoji, no "notification" (say reminder/nudge), no TBA/TBC
  (say "time not announced"), no "don't miss out".
- "We" is the team, "you" is the fan: "We play Serbia on Monday."
- A time always names its city: "21:45 in Volos". Calendars convert; copy must not pretend to.

## Brand (docs/brand.md, assets/brand-tokens.css)

- Wool `#FBF8F2` ground · Ink `#17171C` text · Terrace red `#D7263D` actions · Stand `#6B675F`
  captions · Chalk `#E6E1D8` rules. Team stripes carry the colour; the brand itself stays neutral.
  One exception: the basketball icon is the ball's own orange `#D9600F` (docs/brand.md).
- Type: Bricolage Grotesque (display, 700–800, tight tracking), Albert Sans (UI/body). Google Fonts.
- Wordmark is lowercase `scarf`. Mark: the striped scarf (`assets/scarf-mark.svg`), recoloured per
  team on team surfaces (`assets/scarf-mark-greece.svg`).

## Don't

- Don't add a request to a source "just to check". Don't scrape anything new without an issue first.
- Don't change feed paths or UIDs. Don't print the secondary domain anywhere.
- Don't add accounts, logins or tracking to the static site.
