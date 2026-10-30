# Spike: results written back into past events (#20)

**Date.** 30 October 2026. Nothing was sent to UEFA or FIBA: everything below comes from the test
fixtures, their git history, `src/` and the Actions cache listing.

**Scope.** Today a game leaves the feed the day after it is played (`src/build.ts` keeps
`game.date >= today`), so it also leaves every subscribed calendar. #20 asks for the result to be
written into the past event under the same UID instead. This spike says what the two sources give
us for a finished game, proposes the smallest design and lists the decisions. Feeds and build are
unchanged here.

## Recommendation

**Keep a played game in the feed for 30 days, with a `Final: Greece 2, Serbia 1` line in its
description.** The title stays `Greece vs Serbia`. FIBA already sends every result we need. UEFA
needs one change to the request we already make: an earlier `fromDate`. It stays one request.
UEFA's score field is unconfirmed, so a small probe PR goes first. It moves `fromDate` back,
prints one finished match in the run summary and leaves the feeds as they are. The next daily run
then shows the shape, with no extra request.

The issue's other option, a `Greece 2–1 Serbia` title, breaks the `SUMMARY` rule in CLAUDE.md and
docs/calendar-event-spec.md ("Home vs Away", nothing added), so this spike doesn't propose it.

## What a finished game looks like

| | FIBA (games page, one per competition) | UEFA (`match.uefa.com/v5/matches`, one call) |
|---|---|---|
| Played games in today's answer | **Yes.** The page lists every game of the event. `test/fixtures/fiba-games.html` (cut from the 30 October answer) holds two whole played games: Greece 108, Spain 106 on 31 Aug 2026 and Denmark 64, Spain 74 on 27 Nov 2025 | **No.** We ask from `fromDate=${today}`, so a game is gone the day after |
| Finished marker | `statusCode: "VALID"`, `gameResultStatusCode: "VALID"`, `isLive: false`, `liveGameStatus: 999`, `currentPeriodStatus: "E"`. All 48 games still to come read `INIT` / `EMPTY` with 0 to 0 | `status: "FINISHED"`, seen once: Greece v Netherlands of 1 Oct 2026 in the first fixture (commit eca9b96). Every other saved match is `UPCOMING` |
| Score | `teamAScore`, `teamBScore`. Team A is the home team, as the parser already assumes | **Unconfirmed.** The fixtures keep only the fields the parser reads, so no score field was ever saved. Nothing in the repo shows its name or shape |
| Overtime, penalties | `currentPeriod: "OT1"` on Greece v Spain, so "after overtime" can be told | Unconfirmed. Penalties only happen in knockout games, never in a league or group phase |
| Not seen in any saved answer | A live game, a postponed one (`isPostponed`), a forfeit (`gameResultAdditionalInformation` reads `"None"` on both) | `LIVE`, postponed, abandoned or awarded statuses |

**The saved answers (#99, #106).** Every build except a fixture build writes the raw answers to
`source-answers/` (`uefa.json`, one `{event}.html` per FIBA competition, and `index.json` with each
answer's fetch time and team ids). The Actions job caches that folder as `source-answers-<run>`.
Only a push build restores it, and reuses an answer while it is under a day old. Four entries
exist, all from today, the newest from 17:24 UTC. GitHub's API lists caches but cannot download them, so
none were read. They can't settle the UEFA question anyway: the saved UEFA answer also starts at
`fromDate=${today}`.

**The one change that settles UEFA.** Ask for `fromDate = today − 30 days`. It is still one request,
and its answer would hold every European national-team match of the last 30 days as `FINISHED`,
with whatever score fields UEFA sends. The probe PR keeps today's `date >= today` filter, so the
feeds don't change. Its run summary prints one finished match whole, which then becomes the UEFA
fixture for the build PR.

## The design

**Keep-window.** A played game stays in the feed while `game.date >= today − 30 days`, then leaves
(and leaves fans' calendars) as it does today.

| Days kept | For fans | Cost |
|---|---|---|
| 3 | The result reaches Google, which can take a day to refresh, then the game vanishes | Nothing to speak of |
| **30 (recommended)** | The result stays through the rest of the international window and a few weeks after | UEFA's one answer gains at most one window of matches, around 55 to 100 by estimate. Today's cap is 500 (`src/uefa.ts`) and the matches still to come stay under about 300 once qualifiers are drawn |
| The whole competition | A season's history in the calendar | Free for FIBA, which lists the whole event. For UEFA, a year back adds about 250 matches and can push the answer past 500. The build then fails ("paging is needed"), and paging would break the one-request rule |

The counts are estimates from the comments in `src/uefa.ts`. The probe's run summary can print the
real count.

**The result line.** Written only when the source marks the game finished:

```
UEFA Nations League
Final: Greece 2, Serbia 1
Kickoff 21:45 in Volos
TV: Alpha, Novasports (Greek TV)

Kept up to date by scarf · scarf.fan/greece/football
```

```
FIBA Basketball World Cup 2027 European Qualifiers
Final: Greece 108, Spain 106 after overtime
Tip-off 19:00 in Athens
TV: ERT (Greek TV)

Kept up to date by scarf · scarf.fan/greece/basketball
```

- The result goes second, right under the competition, because calendar previews show the first
  lines. It **replaces the `Tickets:` line**, which has nothing left to sell. The description stays
  at six lines. Without a tickets line it grows from five to six.
- Home team first, as in the title. The teams are named, so the score needs no dash and can't be
  read the wrong way round. The kickoff line stays and keeps its city. The result names no time.
- "Final" for both sports. "Full time" would be the British football word. It would live in `WORDS`
  if Chris prefers it.

**What else changes on a played game** (one with a result, or one whose date is past):

| | Change |
|---|---|
| `UID`, paths | None. The same `uefa-<id>@scarf` or `fiba-<id>@scarf` is updated in place |
| `SUMMARY`, `DTSTART`, `LOCATION` | None |
| `URL` | The team page instead of the ticket link. Greece football carries a team-wide ticket link today |
| `VALARM` | Dropped. A reminder for a game already played has nothing left to say |
| Tickets on sale event | Not written once the game is played. That matches spec § 3 ("it goes when the game is past"), as today |
| `-alerts` variant | Same events and results. `recordSeen` must keep getting **upcoming games only**. Otherwise the wider window reports played games as new: FIBA lists the whole event, and the teams #108 added today have never seen their October games. "New game" entries stay as they are and leave with their game, now 30 days later |
| Build summary (`src/changes.ts`) | No code change. A result shows as a changed line, e.g. `Changed: Greece vs Serbia: Tickets: pame-ethniki.gr → Final: Greece 2, Serbia 1; link … → …`. "N played games left the feed" still counts right, but now 30 days after each game. The comment that says played games leave every day needs new words. "Upcoming games: …" keeps counting upcoming only |
| Team page, share card, landing | Unchanged. They keep the upcoming list, so the next game stays first. The build keeps two lists: the feed's (window) and the page's (upcoming) |

**In code,** for the build PR: `Game` gains `score?: { home: number; away: number }`, plus an
overtime flag if chosen. `parseFibaGames` fills it when `gameResultStatusCode` is `"VALID"`.
`parseUefaMatches` fills it for `FINISHED` from the field the probe finds. The date filter moves
back 30 days for the feed only. `toIcs` handles played games as in the table above. The FIBA
fixture already holds two results, but both are over 30 days before the fixture build's date, so
tests pass their own `today`.

## Risks

- **UIDs and paths.** Neither changes: a result is an in-place update of an event fans already
  have, in the same file. No new event type is added.
- **Calendar refresh lag.** The daily build starts between about 08:40 and 12:10 UTC the morning
  after a game (docs/spike-build-platform.md). Push builds reuse that morning's answer. Then
  Outlook takes about 3 h, sometimes over 24, and Google 12 to 24 h (the #14 test, PR #109). A Thursday
  evening result reaches Google on Friday afternoon or Saturday. Any window under three days risks
  Google fans never seeing it.
- **Updates in place are only proven on Apple.** PR #109 found that iOS replaces an updated event
  cleanly. Google and Outlook are still pending, and a result is the same kind of update. If one of
  them ignores changes to a known UID, results never show there.
- **FIBA stops listing played games.** Results stop, and played games leave the feed the next day,
  as they do today. The run summary would show it: "played games left the feed" the day after a
  game instead of 30 days later. Not new: the zero-games check in `src/fiba.ts` already counts on
  played games being listed, and would fail the build for a team with nothing left to play in the
  event.
- **UEFA's score shape.** A finished match without the expected score is a shape change. By the
  house rule it fails the build, and yesterday's feeds stay online. The probe makes sure the first
  real run doesn't hit this.
- **Corrections.** A result FIBA or UEFA corrects later, e.g. an awarded game, updates in place
  while the game is in the window.

## Decisions that are Chris's

1. **Keep-window:** 30 days (recommended), 3 to 7 days, or the whole competition (UEFA's cap
   stands in the way).
2. **Result line:** `Final: Greece 2, Serbia 1` (recommended) or the issue's `Final: 2–1`. Also: add
   "after overtime" for basketball (recommended, FIBA gives it), and "Final" or "Full time" for
   football.
3. **Title:** keep `Greece vs Serbia` (recommended, CLAUDE.md), or change the `SUMMARY` rule in
   CLAUDE.md and the spec to carry the score.
4. **Order:** the probe PR first (recommended), or straight to the build PR, accepting that a wrong
   guess fails the first daily run.
5. **Team page:** unchanged (recommended), or a "last result" line later as its own issue.
