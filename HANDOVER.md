# scarf — handover to the coding agent

**What this is.** `scarf` is a calendar-subscription service: fans subscribe once and every game of
the national teams they follow (later: clubs) lands in the calendar they already use — kickoff,
venue, TV channel, ticket link, with a reminder an hour before. Working title until today:
"Event schedule" (repo `topless/event-schedule`, live at https://topless.github.io/event-schedule/).

**Brand decision (made).** Name: **scarf** (lowercase wordmark). Direction: *fan culture* —
the scarf is the one fan object football and basketball, national teams and clubs all share.
The brand stays neutral; each team brings its colours as a knitted stripe. Line: *"Your colours,
in your calendar."* Motto: *"Wrapped up in the game."*

**Domain decision (pending, not blocking).** Develop and run the closed-circle test on the GitHub
Pages URL. Recommended purchase when ready: `scarf.fan` (canonical) + `scarfcal.com` (secondary,
301 to canonical). Details in § Domains.

## What is in this pack

| Path | Use |
|---|---|
| `CLAUDE.md` | Drop into the repo root as the coding agent's context file. |
| `docs/brand.md` | Identity spec: tokens, type, logo, team-stripe system, components, voice. |
| `docs/calendar-event-spec.md` | Exact copy and ICS fields for the event, reminder and the four event types. |
| `docs/issues.md` | Points to the GitHub issues, which replaced the first drafts on 2026-10-17. |
| `assets/` | `scarf-mark.svg`, `scarf-mark-greece.svg`, `flag-gr.svg`, `brand-tokens.css`. |
| `reference/team-page.html` | Working, responsive reference of the team page (`/greece/football`). Port, don't redesign. |
| `reference/share-card.html` | 1200×630 share card reference; render it to PNG at build time. |

The design canvas (Claude Design artifact "Event schedule — brand directions") holds the same
material visually: brand sheet, team page, calendar-event spec, share card, product map. Export
PNGs from it if you want pictures next to the HTML.

## Order of work

1. **Rename** — repo and terminology (checklist below). Nobody but Chris is subscribed, so paths
   may change now; after the closed-circle test they may not.
2. **Brand foundations** — tokens, assets, favicon, calendar name/colour, ICS copy from the spec.
3. **Team pages + share cards** — from `reference/`, generated at build for every team in `src/config.ts`.
4. **Closed-circle test** on `https://topless.github.io/scarf/`.
5. **Domain** — buy, set custom domain on Pages, add `CNAME`. GitHub 301s the `github.io` URLs to
   the custom domain, so testers' subscriptions keep working **only if the feed paths are identical**
   on both hosts. Freeze the path scheme in step 1.
6. Alerts, more teams, personal feed, per the GitHub issues.

## Rename checklist

- GitHub: Settings → General → rename `event-schedule` → `scarf`. GitHub redirects the repo URL and
  git remotes; still run `git remote set-url origin git@github.com:topless/scarf.git`.
- GitHub Pages URL becomes `https://topless.github.io/scarf/`. The old Pages path does not redirect.
  Pages source stays "GitHub Actions".
- `package.json`: `"name": "scarf"`, description "Your colours, in your calendar — national-team
  fixtures as calendar feeds".
- Output paths (freeze these): `dist/index.html` (landing: all teams), `dist/greece/football.ics`,
  `dist/greece/basketball.ics`, `dist/greece/football/index.html`, `dist/greece/basketball/index.html`,
  `dist/greece/football/share.png`, `dist/CNAME` (only once the domain exists).
  Scheme: `/{country-slug}/{sport}.ics` and `/{country-slug}/{sport}/`.
- ICS header: `PRODID:-//scarf//feeds//EN`, `X-WR-CALNAME:Greece football · scarf`,
  `X-WR-CALDESC:Every game of the Greece men's national football team — kickoff, venue, TV, tickets. Kept up to date by scarf.`,
  `X-APPLE-CALENDAR-COLOR:#0D5EAF` (team's first stripe colour).
- **Do not change UIDs** (`uefa-…`, `fiba-…`). Stable UIDs are what make updates land in place.
- Words: "Event schedule" → "scarf" ("Scarf" only at the start of a sentence). In copy, "event" →
  "game" (keep `VEVENT` in code). "notification" → "reminder" (or "nudge" in casual copy).
  "TBA/TBC" → "time not announced" / "venue not announced". "fixture" is fine in docs; fans read "game".
- Workflow: name it "Build feeds"; keep the daily schedule; add `workflow_dispatch`.
- README: rewrite the first paragraph with the brand line; keep the "Known limits" and the research
  note; mention the 60-day inactivity rule.

## Domains

- Yes to two domains, one source of truth. Canonical: the one in `CNAME` and in every printed URL
  (recommended `scarf.fan`, CHF ~52 first year then ~108/yr at Gandi). Secondary (`scarfcal.com`,
  ~CHF 10 then ~35/yr): registrar-level web forwarding, 301, path preserved, nothing hosted there.
- GitHub Pages takes one custom domain per repo; the secondary is handled at the registrar.
- Pages add `<link rel="canonical" href="https://{canonical}/greece/football/">`.
- Never print the secondary domain anywhere, including the ICS footer.
- Existing company named Scarf (scarf.sh, open-source analytics) — different product; do a
  EUIPO / Swiss IGE search before spending on anything printed. Not legal advice.

## Data and conduct constraints (carry over from the current build)

- One request per source per run (UEFA, FIBA); their terms do not allow bulk automated collection.
- If a source fails or changes shape, the build fails and the last published files stay online.
- Manual data (TV, tickets, overrides) lives in `src/config.ts` and `src/manual.ts`; hand-entered time
  and venue are used only until the official source has them.
- Scheduled workflows are disabled after 60 days without a push — see the ops issue.

## Definition of done for any change touching feeds

- `npm test` passes; the ICS validates (e.g. `icalendar` validator or `ical.js` parse) and both feeds
  import into Apple Calendar and Google Calendar without warnings.
- Event copy matches `docs/calendar-event-spec.md` byte for byte for the sample fixture.
- No emoji, no exclamation marks, no "notification", no bare times without a city.
