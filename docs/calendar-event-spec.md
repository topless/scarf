# The calendar event · copy spec

Team names are joined with "vs" ("Greece vs Serbia"): decided by Chris on 2026-10-17; the design
originally wrote "v".

This is the surface every subscriber sees, every match week. No logo lives here; the brand is the
team's colour and the voice. All strings below are exact. `{canonical}` is the canonical domain,
`scarf.fan`.

Each sport speaks its own words, the same in the feed as on its team page (`WORDS` in
`src/page.ts`). The samples below are football unless they say otherwise; a basketball feed reads:

| Football | Basketball |
|---|---|
| `kickoff` (feed header) | `tip-off` |
| `Kickoff 21:45 in Volos` | `Tip-off 20:00 in Athens` |
| `Greece vs Serbia kicks off in an hour` | `Greece vs Ukraine tips off in an hour` |
| `time and stadium` (placeholder, new game) | `time and arena` |

## Feed header

```
PRODID:-//scarf//feeds//EN
X-WR-CALNAME:Greece football · scarf
X-WR-CALDESC:Every game of the Greece men's national football team: kickoff, venue, TV, tickets. Kept up to date by scarf.
X-APPLE-CALENDAR-COLOR:#0D5EAF
REFRESH-INTERVAL;VALUE=DURATION:PT12H
X-PUBLISHED-TTL:PT12H
```

Calendar name: team first, brand last, lowercase. Colour: the team's first stripe colour.

## A club's feed

A club's feed follows every rule in this spec; only these values differ (#130). Samples: Olympiacos
in the EuroLeague.

| Field | A club's value |
|---|---|
| `X-WR-CALNAME` | `Olympiacos basketball · scarf` |
| `X-WR-CALDESC` | `Every game of the Olympiacos men's basketball team: tip-off, venue, TV, tickets. Kept up to date by scarf.` |
| `X-APPLE-CALENDAR-COLOR` | the kit's first colour, `#D30D24` |
| `UID` | the source's id: `euroleague-E2026_100@scarf` (EuroLeague), `euroleague-U2026_12@scarf` (EuroCup), `uefa-<matchId>@scarf` for a football club |
| `SUMMARY` | `Olympiacos vs Crvena Zvezda`: the clubs as the source names them, EuroLeague's short name without sponsor or city |
| Competition line | the competition, with the round where the source gives one: `EuroLeague · Round 10` |
| Footer | `Kept up to date by scarf · {canonical}/greece/basketball/olympiacos` |

"We" is the club: `We'll fill in the time as soon as EuroLeague publishes it.` A club has one feed
across competitions, "Olympiacos in Europe": its path names no competition and its UIDs come from
the source, so a club that moves from the EuroCup to the EuroLeague keeps its feed and its subscribers.

## 1 · Timed game (default)

| Field | Value |
|---|---|
| `UID` | source id that never changes, e.g. `uefa-<matchId>@scarf` |
| `SUMMARY` | `Greece vs Serbia`: home team first as the federation lists it; no competition, sport or emoji |
| `DTSTART`/`DTEND` | UTC; duration 2 h (football and basketball alike) |
| `LOCATION` | `Panthessaliko Stadium, Volos`: venue and city; the sources name no country |
| `URL` | the ticket link when there is one (the game's own in `src/manual.ts`, else the team's default in `src/config.ts`, a club's in `src/clubs.ts`), otherwise the team page |
| `DESCRIPTION` | template below |
| `VALARM` | `TRIGGER:-PT1H`, `DESCRIPTION:Greece vs Serbia kicks off in an hour · Alpha, Novasports` |

```
UEFA Nations League
Kickoff 21:45 in Volos
TV: Alpha, Novasports (Greek TV)
Tickets: pame-ethniki.gr

Kept up to date by scarf · {canonical}/greece/football
```

Rules: six lines at most; the TV line is dropped when unknown rather than filled with a guess;
the ticket line is dropped until a link exists; the footer is the only place the brand name appears.
A feed carries one team, so the summary never needs a sport: the combined feed for several teams
(#17) was spiked, closed on 22 October 2026 and dropped (docs/archive/spike-team-picker.md).
A played game stays in the feed for 30 days after its date, exactly as it was and with no score,
then leaves it (#20).

Until the city is announced the kickoff line reads `Kickoff 21:45 at the venue`, as on the team
page and the share card. A team the federation has not named yet (later-round qualifiers) reads
`opponent not announced`, capitalised when it is the home team: `Greece vs opponent not announced`,
`Opponent not announced vs Greece`.

## 2 · Time not announced (all-day placeholder)

Same `UID` as the eventual timed game, so the placeholder turns into the game in place.

| Field | Value |
|---|---|
| `SUMMARY` | `Greece vs Ukraine · time not announced` |
| `DTSTART;VALUE=DATE` | the announced date |
| `DESCRIPTION` | see below |

```
FIBA Basketball World Cup 2027 European Qualifiers
Venue not announced
We'll fill in the time and arena as soon as FIBA publishes them.

Kept up to date by scarf · {canonical}/greece/basketball
```

A football placeholder waits for the time and the stadium: `We'll fill in the time and stadium as
soon as UEFA publishes them.`

## 3 · Tickets on sale (alert event, repo issue #2)

All-day event on the day sales open, driven by a manual `onSale` date in `src/manual.ts`.

| Field | Value |
|---|---|
| `UID` | `<game uid>-tickets@scarf` |
| `SUMMARY` | `Tickets on sale · Greece vs Serbia` |
| `URL` | the ticket link |
| `VALARM` | `TRIGGER;VALUE=DATE-TIME` at 09:00 local on that day, `DESCRIPTION:Tickets for Greece vs Serbia go on sale today · pame-ethniki.gr` |

```
Sales open today at pame-ethniki.gr
The game: Mon 16 Nov, 21:45 in Volos, Panthessaliko Stadium

Kept up to date by scarf · {canonical}/greece/football
```

While the time is not announced the game line says so; the venue stays only while it is known:

```
Sales open today at pame-ethniki.gr
The game: Mon 16 Nov, time not announced, Panthessaliko Stadium

Kept up to date by scarf · {canonical}/greece/football
```

Rules: the event needs both the `onSale` day and a ticket link; it lives as long as its game, so it
leaves the feed with it, 30 days after the game, and removing the day removes it in place on the next build. The day and the
kickoff are venue-local; the kickoff reads `21:45 at the venue` until the city is announced, as on the
kickoff line, and is left out while the venue's UTC offset is unknown.
The reminder is 09:00 at the venue, from the game's UTC offset, so it lands an hour off when the
clocks change between the sale day and the game; without one it is nine hours into the
all-day event (`TRIGGER;RELATED=START:PT9H`), which is 09:00 in the reader's own zone.

## 4 · New game announced (optional, off by default)

All-day event on the day the build first sees a new `UID`. Only in the `-alerts` feed variant
(e.g. `/greece/football-alerts.ics`), never in the default feed.

| Field | Value |
|---|---|
| `UID` | `<game uid>-new@scarf` |
| `SUMMARY` | `New game · Georgia vs Greece, 1 Mar 2027` |

```
Just announced by FIBA. It's already in this calendar, with time and arena to follow.

Kept up to date by scarf · {canonical}/greece/basketball
```

## Reminder behaviour

Which calendar apps honour the `VALARM` is recorded once, in docs/development.md under Known limits.
The team page says, in one line: "On Google Calendar, set a notification for this calendar once. It
applies to every game."

## Voice checks (test these as string assertions)

- No `!`, no em dash, no emoji, no "notification", no "TBA"/"TBC"/"TBD", no "don't miss", except "set a notification" in the Google Calendar line above, which names Google's own setting.
- Every time is followed by ` in <City>`, or ` at the venue` until the city is announced. A time may read ` UTC` while the venue's offset is unknown, on the page and the share card only (the feed drops the line).
- Summary never contains the competition or the sport.
