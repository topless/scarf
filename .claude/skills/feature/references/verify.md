# Verifying a change, by area

Evidence is what goes into the PR under Verification: the test count with what the new tests protect,
what a render or a build produced, spot checks quoting the actual strings. "Checked, works" is not
evidence. Everything below except the real build runs from hand-built games, so it costs no request
to a source.

## Rendering without the network

`npm run build` fetches. Drive the renderers directly instead, from the repository root, with games
shaped like the ones in `test/page.test.ts`. The script is fed on stdin so nothing lands in the
repository; `OUT` points at the scratchpad. Node resolves the relative imports against the current
directory and strips the types.

```bash
OUT=<scratchpad>/out node --input-type=module - <<'JS'
import { cp, mkdir, writeFile } from 'node:fs/promises'
import { teams } from './src/config.ts'
import { toIcs } from './src/ics.ts'
import { renderLanding, renderTeamPage } from './src/page.ts'
import { renderShareImage } from './src/share.ts'

const now = new Date()
const site = 'https://topless.github.io/scarf'
const [football] = teams
const timed = { id: 'uefa-1', competition: 'UEFA Nations League', home: 'Greece', away: 'Germany',
  date: '2026-10-04', kickoff: '2026-10-04T18:45:00Z', utcOffsetHours: 3, venue: 'Toumba Stadium',
  city: 'Thessaloniki', tv: 'Alpha', tickets: 'https://tickets.example/a' }
const unscheduled = { id: 'fiba-2', competition: 'Qualifiers', home: 'Greece', away: 'Georgia', date: '2026-11-26' }

const out = process.env.OUT
await mkdir(`${out}/greece/football`, { recursive: true })
await cp('assets', out, { recursive: true })
await writeFile(`${out}/greece/football/index.html`, renderTeamPage({ team: football, games: [timed, unscheduled] }, teams, now, site))
await writeFile(`${out}/index.html`, renderLanding(teams.map((team) => ({ team, games: [timed] })), now, site))
await writeFile(`${out}/greece/football/share.png`, await renderShareImage(football, timed, site))
await writeFile(`${out}/greece/football.ics`, toIcs(football, [timed, unscheduled], now, site))
JS
```

Adapt the team, the games and the renderer to the change (a team with no games, a three-colour team,
a FIBA game, whatever the acceptance criteria name). The calls above match the signatures in `src/` on
2026-10-17; when one fails to run, read the export in `src/page.ts`, `src/share.ts` or `src/ics.ts` and
fix the recipe in the same PR that changed it.

## Pages (`src/page.ts`, `assets/site.css`)

- `npm test` covers the strings, links and escaping in `test/page.test.ts`; add the new criterion there.
- Serve the render and look at it at the two widths the issues ask for, 390 px and 1280 px:

```bash
python3 -m http.server 8080 --directory <scratchpad>/out
```

  In the browser pane open `http://localhost:8080/greece/football/`, resize to 390 wide and to
  desktop, and check `document.documentElement.scrollWidth <= window.innerWidth` for horizontal
  scroll, that every control is a real `<button>` or `<a>`, and that the strings read as the issue
  says. Read `document.body.innerText` for a text check rather than a screenshot.
- Feed links on the page must equal the files the build writes: compare the `href` values with
  `feedPath` in `src/config.ts`.

## Share images (`src/share.ts`)

- `test/share.test.ts` checks the copy, colours, 1200×630 and the 300 KB guard; extend it.
- Look at the PNG the render wrote (the Read tool shows images) and note its size:

```bash
stat -f %z <scratchpad>/out/greece/football/share.png
```

- The template is a copy of `reference/share-card.html` in Satori's flexbox subset. A layout change
  is made in both and compared side by side in the browser.

## Feeds (`src/ics.ts`, `src/game.ts`, `src/uefa.ts`, `src/fiba.ts`)

- `test/output.test.ts` holds the spec's sample games byte for byte (`docs/calendar-event-spec.md`).
  A copy change updates the spec and the test together; a spec that disagrees with the test is a bug
  in one of them.
- Structural check on the rendered `.ics`: CRLF line ends, every `VEVENT` carries `UID`, `DTSTAMP`,
  `DTSTART` and `SUMMARY`, no line over 75 octets before folding is undone:

```bash
f=<scratchpad>/out/greece/football.ics
printf 'events %s  uids %s  dtstart %s  summaries %s\n' "$(grep -c '^BEGIN:VEVENT' "$f")" \
  "$(grep -c '^UID:' "$f")" "$(grep -c '^DTSTART' "$f")" "$(grep -c '^SUMMARY:' "$f")"
awk 'length($0) > 76 { print "long line " NR ": " length($0) }' "$f"
grep -c $'\r$' "$f"   # equals the line count when every line ends in CRLF
```

- UIDs must not change for existing games. Compare with the live feed, which is our own Pages output
  and not a source request:

```bash
curl -s https://topless.github.io/scarf/greece/football.ics | grep '^UID:' | sort
```

- A client check (Apple Calendar, Google Calendar) cannot run here; it becomes a "Verify after
  merging" step with the exact subscribe URL and what to look for.

## Data and teams (`src/config.ts`, `src/manual.ts`, `assets/flag-*.svg`)

- `test/config.test.ts` holds the invariants (unique frozen paths, two or three hex colours, flag
  files exist, https ticket links); run it and extend it for a new field.
- TV and ticket values are confirmed on the rights holder's or the federation's own page, with the
  URL and the date as a comment next to the value, the way `src/config.ts` already does.
- A new football team is free (UEFA answers for every team id in one call). A new FIBA competition is
  a new page per run: say so in the plan and get the maintainer's yes before adding it.
- The first stripe colour becomes the calendar colour; a flag file is added to `assets/`.
- This is the one area where a real build is usually warranted, once:

```bash
SITE_URL=https://topless.github.io/scarf npm run build
```

  Read the console lines (`Greece football: 2 upcoming games`), spot-check two strings in the new
  feed and page, and write the request count into the PR.

## Workflows (`.github/workflows/`)

- They only run from `main`, so nothing here proves them. Lint when the tool is present
  (`command -v actionlint && actionlint`), dry-run any `github-script` step with mocked clients (as
  #29 did), and write the manual pass as numbered steps under "Verify after merging": which workflow
  to run by hand, which log line or issue to expect.
- A change to the publish job is checked after merging with `gh run watch` and a `curl -sI` of the
  deployed path.

## Docs (`README.md`, `CLAUDE.md`, `docs/`)

- Every path, command and number quoted in a doc still matches the code: grep the doc for the names
  the change touched.
- Voice applies to docs that fans may read (README): sentence case, no exclamation marks.
