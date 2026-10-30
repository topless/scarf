# The calendar event — copy spec

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
X-WR-CALDESC:Every game of the Greece men's national football team — kickoff, venue, TV, tickets. Kept up to date by scarf.
X-APPLE-CALENDAR-COLOR:#0D5EAF
REFRESH-INTERVAL;VALUE=DURATION:PT12H
X-PUBLISHED-TTL:PT12H
```

Calendar name: team first, brand last, lowercase. Colour: the team's first stripe colour.

## 1 · Timed game (default)

| Field | Value |
|---|---|
| `UID` | source id, e.g. `uefa-<matchId>@scarf` — never changes |
| `SUMMARY` | `Greece vs Serbia` — home team first as the federation lists it; no competition, sport or emoji |
| `DTSTART`/`DTEND` | UTC; duration 2 h (football and basketball alike) |
| `LOCATION` | `Panthessaliko Stadium, Volos, Greece` — full venue, city, country |
| `URL` | ticket link while on sale, else the team page |
| `DESCRIPTION` | template below |
| `VALARM` | `TRIGGER:-PT60M`, `DESCRIPTION:Greece vs Serbia kicks off in an hour · Alpha, Novasports` |

```
UEFA Nations League
Kickoff 21:45 in Volos
TV: Alpha, Novasports (Greek TV)
Tickets: pame-ethniki.gr

Kept up to date by scarf · {canonical}/greece/football
```

Rules: six lines at most; the TV line is dropped when unknown rather than filled with a guess;
the ticket line is dropped until a link exists; the footer is the only place the brand name appears.
In a combined personal feed the summary gains a sport suffix: `Greece vs Serbia · football`.

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

## 3 · Tickets on sale (alert event — repo issue #2)

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
goes when the game is past, and removing the day removes it in place on the next build. The day and the
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
Just announced by FIBA. It's already in this calendar — time and arena to follow.

Kept up to date by scarf · {canonical}/greece/basketball
```

## Reminder behaviour to document on the team page

Outlook honours `VALARM` from a subscribed feed. iPhone Calendar stores it but never schedules it
(iOS 17.5 and 18 in the Simulator; see README), so iPhone users need Default Alert Times. Google
Calendar ignores it and uses the user's default notification for that calendar. The team page says
so next to the subscribe buttons, one line each:
"In your iPhone's Calendar settings, set Default Alert Times › Events to 1 hour before — it covers
every timed event, games included. See it on an iPhone." (linking to `/how-it-works/#see-it`) and
"On Google Calendar, set a notification for this calendar once — it applies to every game."

## Voice checks (test these as string assertions)

- No `!`, no emoji, no "notification", no "TBA"/"TBC"/"TBD", no "don't miss".
- Every time is followed by ` in <City>`, or ` at the venue` until the city is announced.
- Summary never contains the competition or the sport (except the ` · football` suffix in a combined feed).
