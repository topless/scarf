# Spike: EuroLeague clubs, starting with the Greek ones (#113)

**Archived.** The spike of 31 October 2026, kept as it was. Its paths (`/greece/olympiacos-basketball`)
were superseded by #130 (`/greece/basketball/olympiacos`); its data layer shipped (#113).

**Date.** 31 October 2026. The API's answer, the pages and the figures are as of that day.

**Scope.** Fans keep asking for the EuroLeague. The card asks to explore adding its clubs, starting
with the Greek ones, so that the model, the paths and the pages are settled before any other club
comes. This note records the one probe of the source, the model chosen and the prototype on this
branch: Olympiacos and Panathinaikos, each with a feed, an `-alerts` feed, a page and a share image,
built from a fixture, with every test passing. Out of scope: the other 18 clubs, the EuroCup, the
Greek league, and the team picker (#17). #21 asked the wider question for local clubs, whether a
club's games come from a federation or from the club; for EuroLeague clubs the league itself is the
one source for all of them, so that question does not arise here.

## Recommendation

**Go, two clubs first.** One request a day answers a whole EuroLeague season for every club in it,
with UTC tip-offs, the venue's offset and the arena, which is more than FIBA gives the national
teams. A club fits the team list as it is, under its country, with its own stripes; the paths stay
frozen for every existing feed. The prototype is a few hundred lines, most of them the arena table,
the fixture and tests. Ship Olympiacos and Panathinaikos, watch a round or two, then add any other
club as one entry in `src/config.ts` when a fan asks. The decisions to take before merging are
listed at the end; none blocks the two clubs.

## The source

**One probe**, on 2026-10-31 at 08:36 UTC, with scarf's user agent, answered 200 and saved to a file
before anything was parsed:

```
GET https://api-live.euroleague.net/v2/competitions/E/seasons/E2026/games
    380 games: the whole 2026-27 regular season (38 rounds, 20 clubs), 18 of the Greek clubs' 74
    already played, 725 KB of JSON. Headers: cache-control: public, max-age=7200, cf-cache-status: HIT,
    access-control-allow-origin: *, api-supported-versions: 1.0, 2.0, 3.0. No key, no cookie.
```

It is the API behind euroleaguebasketball.net, undocumented, and what the open-source wrappers use
(py-euroleague on PyPI, euroleaguer on CRAN). Every game carries:

- `identifier` (`E2026_100`): the season and the game's number in it, unique across seasons; the
  calendar UID. `gameCode` alone restarts at 1 every season.
- `utcDate` with a `Z`, `localDate` at the venue and `localTimeZone`, the venue's offset in hours,
  which matched Athens (+2), Madrid (+1) and Kaunas (+2) on the day. `confirmedHour` says whether the
  time is real; every game of the season had one.
- `local` and `road` (home and away) with the club's `code` (`OLY`, `PAN`), `name` with sponsor
  and city (`Panathinaikos AKTOR Athens`), `abbreviatedName` (`Panathinaikos`) and `editorialName`
  (`Barca`, `Efes`).
- `venue` with a `code`, a name in capitals (`SUNEL ARENA`) and a free-text address, no city field.
  `roundName` (`Round 10`), `phaseType` (`Regular Season`), `played`.

Not in the answer yet: the play-in, the playoffs and the Final Four. They appear when the season
reaches them; a club object has an `isVirtual` flag, which suggests placeholder sides then. Untested.

**Terms.** EuroLeague publishes none for the API. euroleaguebasketball.net has no general terms page
that a search finds (its legal pages are EuroLeague TV's conditions, privacy and cookies), and it
answers 403 to a fetch. So the API stands where UEFA's and FIBA's do, or a little better: open, keyless,
cached two hours at its edge, and used as a friends-only tool would, one request a day.

**The city.** No source field. The pages and feeds always name a city with a time, so `VENUES` in
`src/euroleague.ts` lists the season's 23 arenas by venue code, with the name as the arena writes it
and the city fans name: Athens for Marousi and Ano Liosia, Milan for Assago, Lyon for Décines. An arena
not in the table shows the API's name in capitals with no city, so the line reads "21:15 at the venue"
until the row is added; the build does not fail over it. Hapoel and Maccabi play their home games in
Sofia and Belgrade this season; the table says so.

**The season.** The season code is in the team's source, `E2026`, as a FIBA team names its competition.
After the Final Four in May the feed empties on its own as the games pass; when the next season's games
are published, July as a rule, the code becomes `E2027`. Deriving the season from the date was the
alternative: it would ask for a season that does not exist yet from July to September and fail every
daily build, the national teams' feeds included, for a line saved once a year.

## The model

A club is a team under its country, and nothing else changes shape:

```ts
{ country: 'greece', sport: 'basketball', club: { slug: 'olympiacos', name: 'Olympiacos' },
  name: 'Olympiacos basketball', side: "Olympiacos men's basketball team",
  colours: ['#E4002B', '#FFFFFF'], flag: 'gr',
  source: { kind: 'euroleague', season: 'E2026', clubCode: 'OLY' }, defaults: { tv, tickets } }
```

**Paths.** `/greece/olympiacos-basketball.ics`, `/greece/olympiacos-basketball-alerts.ics`,
`/greece/olympiacos-basketball/` and its `share.png`. The alternatives, and why not:

- `/olympiacos/basketball.ics`, the club in the country's slot: no path code to change, but
  `/olympiacos/` becomes a country page, the landing groups by country, and a club has no flag.
- `/greece/olympiacos/basketball.ics`, three slots: every relative link and both page roots change,
  for nothing a fan sees.
- `/greece/olympiacos-basketball` keeps `/greece/basketball` for the national team, keeps the sport in
  the slug (Olympiacos has a football side in Europe too), and keeps the country page as the front door.

The known-games key follows the path (`greece/olympiacos-basketball`), and the UID the API's identifier
(`euroleague-E2026_100@scarf`). A derby is one event in both clubs' feeds under one UID: a fan
subscribed to both sees it twice, as two subscriptions always did.

**The country list.** `COUNTRIES` in `src/config.ts` now holds every country, the five hand-written ones
included, and the pages take a country's name, stripes and flag from it (`countryOf`) instead of
cutting the name out of the team's name: that shortcut in `src/page.ts` is gone. A club's card and page
wear the country's name and flag over the club's own stripes.

## What the pages do

From `npm run build:fixtures`, served locally and on the staging Worker of #85 (PR #124), built
from the fixtures with the staging address as `SITE_URL` and a `dist/_headers` file that marks every
page `noindex`, so scarf.fan is untouched:

- **Landing and country card.** The two sport cells as before, then one cell per club: the club's name
  where the sport was, the ball icon, "EuroLeague" where "FIBA" is, and the club's own 6 px stripe
  along the top of the cell. Greece's card goes to five cells, two rows at 1120 px, one column on a
  phone.
- **Club page.** The band, the next-game card and the share image in the club's stripes. The country
  bar keeps the Greek flag and "Greece" linking the country page; its switch now holds Football ·
  Basketball · Olympiacos · Panathinaikos. The sport tag reads "Men's basketball · EuroLeague", the
  lede "Every tip-off, arena, channel and ticket sale for Olympiacos", the note under the buttons
  "Updated daily from EuroLeague". The "Other teams" chips stay one per country; on a club's page the
  country's own chip is the current one and opens the national team in the same sport.
- **Share images.** The club's: "Club · Men's basketball" next to the Greek flag, "Olympiacos
  basketball, in your calendar.", the club's stripes, its next game, its own path in the footer. The
  country's: "National teams and clubs · Football and basketball" and the four teams by name.
- **Feed.** `X-WR-CALNAME:Olympiacos basketball · scarf`, colour `#E4002B`, `SUMMARY:Olympiacos vs
  Crvena Zvezda`, description "EuroLeague · Round 10 / Tip-off 21:15 in Athens / TV: Novasports (Greek
  TV) / Tickets: ticketmaster.gr / Kept up to date by scarf · scarf.fan/greece/olympiacos-basketball".
  The reminder: "Olympiacos vs Crvena Zvezda tips off in an hour · Novasports". 30 upcoming games per
  club in the fixture build, 38 a season plus whatever the playoffs bring.
- **How it works and the kit.** Step 2 reads "from UEFA, FIBA and EuroLeague"; the kit's basketball
  card names both sources and lists the two clubs among Greece's teams.

## Decisions to take

1. **Club names in titles.** The prototype uses the API's `abbreviatedName`: Olympiacos,
   Panathinaikos, Real Madrid, Crvena Zvezda, Bayern Munich, Milan, Hapoel TLV, LDLC ASVEL. The
   alternatives are the full `name` with sponsor and city (Panathinaikos AKTOR Athens, Crvena Zvezda
   Meridianbet Belgrade) or the `editorialName` (Barca, Real, Efes). The spec's "as the federation
   lists it" now says a club reads as EuroLeague abbreviates it.
2. **Spelling.** "EuroLeague", the brand's own, everywhere a fan reads it: the sport tag, the source
   line, the competition line. The card says Euroleague.
3. **The competition line.** "EuroLeague · Round 10", with the round, where a national team's reads
   "UEFA Nations League". The round could go.
4. **The switch on the country bar.** Four segments for Greece, which is already wider than a phone:
   the first build clipped "Olympiacos" at 375 px. The prototype lets the pill scroll sideways within
   the bar (three CSS declarations, no scrollbar). Spain would have six segments (Real Madrid,
   Barcelona, Baskonia, Valencia) and scroll further; a row of chips under the bar, or the clubs
   behind one "Clubs" segment, are the alternatives. Decide when the first country with three or more
   clubs comes.
5. **Kit colours.** `#E4002B` for Olympiacos and `#007A33` for Panathinaikos are my picks, marked "to
   confirm" in docs/brand.md.
6. **TV.** "Novasports (Greek TV)" for both, from SportBusiness's report that Euroleague renewed with
   United Media (Nova) for five seasons, 2023-24 to 2027-28. Sport24 is a digital partner for 2025-26
   and 2026-27, not a channel. Confirm on novasports.gr before the first round goes out.
7. **Tickets.** Olympiacos sells through ticketmaster.gr/osfpbc, Panathinaikos through
   paobc.more.com, both linked from the clubs' own sites on the day; set as the teams' defaults.
8. **The landing's description** still says "the national teams we follow". Change it with the clubs,
   or once there are more than two.
9. **A club whose country has no national team on scarf** (Dubai, so the United Arab Emirates) needs a
   `COUNTRIES` row with name, stripes and flag before its entry, or its card has nothing to wear. Not
   needed for the Greek clubs.

## Effort and cost

- The prototype on this branch: `src/euroleague.ts` (90 lines, 23 of them the arena table), the club
  model and paths in `config.ts`, the pages and share cards, the fixture (the probe cut to the two
  clubs' 74 games and the fields the parser reads, 68 KB) and tests: 19 files changed, about 350 lines
  added and 110 removed, the new module and fixture apart. `npm test`: 102 tests pass in about 7 s.
  `npm run build:fixtures`: 6.6 s, two more share images.
- The daily run makes one more request, and a push build reuses the day's answer as it does UEFA's and
  FIBA's (`source-answers/euroleague-E2026.json`).
- Another club in the same season: one config entry with its TV and ticket lines, a `COUNTRIES` row if
  its country is new, arena rows if its arena is. All 18 other clubs: 18 entries and one country row.
- Once a year: the season code.

## Risks

- The API is undocumented and may change or close. Then the build fails loudly, as with UEFA and FIBA,
  and the last published site stays online.
- The playoffs' shape is unknown: round names, placeholder sides. The parser takes `roundName` as it
  comes and names a side by its `abbreviatedName`, so a placeholder would read as EuroLeague writes it.
  Check the answer in April, before the first playoff round.
- Rate limits are unknown. One request a day, cached two hours at their edge, is unlikely to meet one.
