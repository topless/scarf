# Issue drafts for topless/scarf

Grouped by milestone. Labels: `brand` `feeds` `pages` `alerts` `data` `ops` `later`.
These drafts became the GitHub issues on 2026-10-17; the issues are the source of truth now.
The existing issue **#2 "Alert when a new game or ticket sale is announced"** stays as the umbrella;
issues 7 and 8 reference it.

---

## Milestone M1 — Rename & brand foundations

### 1. Rename repository and terminology to scarf
Labels: brand, ops

**Why.** The brand is decided; nobody but the maintainer is subscribed yet, so paths can still change.

**What.** Follow the rename checklist in `HANDOVER.md`: repo name, `package.json`, workflow name,
output paths (`/{country}/{sport}.ics`, `/{country}/{sport}/`), ICS header fields, README, copy
words ("game" not "event", "reminder" not "notification", "time not announced" not "TBA").
Keep every `UID` unchanged.

**Acceptance.** `npm test` and `npm run build` pass; `dist/greece/football.ics` and
`dist/greece/basketball.ics` exist; no occurrence of "Event schedule", "TBA" or "notification" in
`src/`, `dist/` or `README.md`; `git log` shows UIDs unchanged for the sample fixtures.

### 2. Brand assets, tokens, favicon and app icon
Labels: brand

**What.** Add `docs/brand.md`, `assets/brand-tokens.css`, `assets/scarf-mark.svg`,
`assets/scarf-mark-greece.svg`, `assets/flag-gr.svg` from the handover pack. Generate
`favicon.svg`, `apple-touch-icon.png` (180 px) and a 512 px icon from the red rounded-square spec.
Load Bricolage Grotesque and Albert Sans from Google Fonts with `display=swap`.

**Acceptance.** Pages reference the tokens file; icons present in `dist/`; Lighthouse shows no
missing-icon warnings.

### 3. Apply the calendar-event spec to feed generation
Labels: feeds

**What.** Implement `docs/calendar-event-spec.md`: `SUMMARY`, two-hour `DURATION`, full
`LOCATION`, `URL`, the `DESCRIPTION` template (lines dropped when unknown), `VALARM` text,
`X-WR-CALNAME`, `X-WR-CALDESC`, `X-APPLE-CALENDAR-COLOR`, `REFRESH-INTERVAL`. Add string
assertions for the voice checks (no `!`, emoji, "TBA", "notification"; every time followed by
` in <City>`).

**Acceptance.** Snapshot tests for a timed game and a time-not-announced placeholder match the spec
byte for byte; both feeds validate and import into Apple Calendar and Google Calendar.

### 4. Team pages and landing page from the reference HTML
Labels: pages

**What.** Generate `/{country}/{sport}/index.html` for every team in `src/config.ts` from
`reference/team-page.html` (static, responsive, no JS needed beyond the copy-link button):
stripe band, hero with subscribe panel (webcal, Google Calendar link, paste URL), next-game card,
upcoming games, how it works, other teams, footer with the last-run line. Generate `/index.html`
listing all teams. Add the Google Calendar reminder note from the spec.

**Acceptance.** Pages render at 390 px and 1280 px without horizontal scroll; every button is a real
`<button>` or `<a>`; feed URLs on the page equal the files in `dist/`; `webcal://` links use the
host the page is served from.

### 5. Share image per team at build time
Labels: pages, brand

**What.** Render `reference/share-card.html` to `/{country}/{sport}/share.png` (1200×630) at build —
Playwright screenshot or Satori + resvg, whichever is simpler in Actions — with the team's stripe,
the recoloured mark and the next game. Add `og:image`, `og:title`, `og:description`, `twitter:card`.

**Acceptance.** Pasting a team URL into a chat app shows the card; image under 300 KB.

### 6. Custom-domain readiness
Labels: ops

**What.** Read the canonical host from an env var / config with a default of
`topless.github.io/scarf`; write `dist/CNAME` only when set; emit
`<link rel="canonical">` and absolute URLs from that host; document the 301 plan (GitHub Pages →
canonical; secondary domain forwarded at the registrar; never print the secondary).

**Acceptance.** Build with and without the variable produces correct absolute URLs; feed paths are
identical on both hosts.

---

## Milestone M2 — Alerts (umbrella: #2)

### 7. "Tickets on sale" calendar event
Labels: alerts, feeds — relates to #2

**What.** Add an optional `onSale` date (and `ticketUrl`) per game in `src/manual.ts`. Emit an
all-day event on that date with its own `UID` (`<game uid>-tickets@scarf`), summary
`Tickets on sale · Home vs Away`, 09:00 local alarm, description per spec. Drop it once the game is past.

**Acceptance.** Fixture with an on-sale date produces exactly one extra event; removing the date
removes it in place; copy matches the spec.

### 8. Optional "new game announced" alerts feed variant
Labels: alerts, feeds — relates to #2

**What.** Persist the set of known UIDs between builds (commit a small JSON next to the config).
When a new UID appears, emit an all-day "New game · …" event on that day — only in a separate
`/{country}/{sport}-alerts.ics` that contains everything in the default feed plus alerts. Team page
offers it as "also tell me when a new game is announced".

**Acceptance.** First build after a new fixture yields one alert event in the `-alerts` feed and none
in the default feed; the JSON state is updated by the Actions run.

### 9. Verify placeholder → timed transition in Apple and Google
Labels: feeds, data

**What.** Test the open question from `docs/research-2026-10-02.md`: an all-day placeholder with a
stable `UID` replaced by a timed event. Record behaviour in Apple Calendar (iOS/macOS), Google
Calendar (web, Android) and Outlook; adjust `SEQUENCE`/`DTSTAMP` handling if any client duplicates.

**Acceptance.** A short note in `docs/` with screenshots; a test covering `SEQUENCE` increments.

---

## Milestone M3 — Teams & personal feed

### 10. Add Spain and Denmark (football and basketball)
Labels: data

**What.** Add config entries (UEFA team ids; FIBA event + team codes per competition), TV and
ticket sources per the research note, team stripe colours (`#AA151B/#F1BF00`, `#C60C30/#FFFFFF`).

**Acceptance.** Four new feeds and pages build; still one request per source per run (batch where
the source allows, otherwise schedule per-team requests across the day and document it).

### 11. Women's and U21 sides for existing federations
Labels: data

**What.** Same shape, new ids; paths `/{country}/{sport}-women.ics`, `/{country}/{sport}-u21.ics`.
Team page lists them under the same flag.

**Acceptance.** Feeds build; landing groups them under the country.

### 12. Team picker and combined personal feed (spike first)
Labels: pages, feeds

**What.** Spike two approaches and pick one: (a) pre-built combinations are combinatorial — rule
out beyond ~3 teams; (b) a tiny worker (Cloudflare Workers / Deno Deploy) that merges selected
static feeds at request time: `/my.ics?t=greece-football,greece-basketball`, no accounts, the
choice lives in the URL. Then build the picker page in the brand (chips with stripes) that outputs
that URL and the three subscribe buttons.

**Acceptance.** Spike note with the decision; picker page; combined feed validates and keeps each
event's UID; summary gains the ` · sport` suffix per spec.

---

## Milestone M4 — Ops & reach

### 13. Keep the daily workflow alive and alert on failure
Labels: ops

**What.** GitHub disables scheduled workflows after 60 days without pushes: add a keepalive (the
build commits a `last-run` stamp or uses a keepalive action), `workflow_dispatch`, and failure
notifications (Actions email / a simple webhook). Document in README.

**Acceptance.** A dry run with the schedule shows the keepalive commit; a forced failure notifies.

### 14. Where-to-watch by country
Labels: data

**What.** A hand-maintained table of broadcasters per game per country (GR, CH, DE, UK, US to
start) for fans abroad; shown in the event description as `TV: Alpha, Novasports (GR) · Sport1 (DE)`
only where known.

**Acceptance.** Description line builds from the table; unknown countries are omitted, never guessed.

### 15. Results written back into past events
Labels: feeds, later

**What.** After a game, update the event summary to `Greece 2–1 Serbia` (or description line
"Final: 2–1") from the same source, keeping the UID. Spike what UEFA/FIBA expose without extra requests.

### 16. Local clubs — discovery spike
Labels: later, data

**What.** Pick one Greek pro club (football) and one basketball club; find a permissible fixture
source (federation/league pages), map it to the same event shape, estimate maintenance. Decide
whether clubs are federation-fed or club-submitted.

**Acceptance.** A one-page note with sources, terms, effort and a go/no-go.
