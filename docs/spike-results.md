# Spike: keep played games in the feeds (#20)

**Date.** 30 October 2026; Chris decided on 31 October. Nothing was sent to UEFA or FIBA: everything
below comes from the test fixtures, their git history, `src/` and the Actions cache listing.

**Scope.** Today a game leaves the feed the day after it is played (`src/build.ts` keeps
`game.date >= today`), so it also leaves every subscribed calendar, where it can read as a
cancelled game. #20 asked for the result to be written into the past event under the same UID. This
spike looked at what the two sources give for a finished game and what that would take. Feeds and
build are unchanged here.

## Decision

**A played game stays in the feed for 30 days, exactly as it was, with no score.** Chris chose this
over writing results back (31 October 2026):

- A calendar answers when and where we play. Score apps have the result at full time. A feed would
  carry it the next morning at the earliest, and Google can take another day to show it.
- A score in the calendar can spoil a game watched later.
- What fans lose today is the game itself, the day after it is played.
- Keeping games costs next to nothing. A feed is about 2 KB, and 30 days of played games add one to
  three events per team, about 0.6 KB each. Calendar apps fetch the whole file every 12 hours
  anyway, and Cloudflare serves static files for free.

Results stay possible later as an opt-in feed at a new address, like the `-alerts` variant. "For
later" below says what the sources give for that.

## The design

**Keep-window.** A played game stays while `game.date >= today − 30 days`, then leaves the feed and
fans' calendars, as it does the day after today.

| Days kept | For fans | Cost |
|---|---|---|
| 7 | The week after the game | Nothing to speak of |
| **30 (recommended)** | The rest of the international window and a few weeks after | UEFA's one answer gains at most one window of matches, around 55 to 100 by estimate. Its cap is 500 (`src/uefa.ts`), and the matches still to come stay under about 300 once qualifiers are drawn |
| The whole competition | A season's history in the calendar | Free for FIBA, which lists the whole event. For UEFA, a year back adds about 250 matches and can push the answer past 500. The build then fails ("paging is needed"), and paging would break the one-request rule |

The counts are estimates from the comments in `src/uefa.ts`.

**The sources.** Still one request each:

- **FIBA** already lists every game of the event, played ones included. The parser reads them today
  (`fiba-127101`, Greece v Spain of 31 Aug 2026, is in `test/sources.test.ts`), and the build drops
  them. Nothing to change.
- **UEFA** answers from `fromDate`, so the one request asks from `today − 30 days` instead of
  `today`. A played match comes back as `status: "FINISHED"`. The one finished match ever saved
  (Greece v Netherlands of 1 Oct 2026, first fixture, commit eca9b96) has every field the parser
  read then: kickoff, teams, competition, stadium. The team ids the parser reads since every team
  shares one call weren't saved then. Nothing suggests a finished match drops them, and if it did,
  the build would fail loudly and yesterday's feeds would stay online.

**What changes on a played game:**

| | Change |
|---|---|
| The event: `UID`, title, time, place, description, link, reminder | Nothing. It stays exactly as it was, so nothing updates in fans' calendars |
| Tickets on sale event | Stays with its game, now 30 days longer. Spec § 3's "it goes when the game is past" becomes "it leaves with its game" |
| `-alerts` variant | Same events. `recordSeen` must keep getting **upcoming games only**. Otherwise the wider window reports played games as new: FIBA lists the whole event, and the teams #108 added on 30 October have never seen their October games. "New game" entries leave with their game, now 30 days later |
| Build summary (`src/changes.ts`) | No code change. "N played games left the feed" still counts right, but now 30 days after each game, and the comment that says played games leave every day needs new words. "Upcoming games: …" keeps counting upcoming only |
| Team page, share card, landing | Unchanged. They keep the upcoming list, so the next game stays first. The build keeps two lists: the feed's (the window) and the page's (upcoming) |

**In code,** for the build PR: `fromDate` in `src/uefa.ts`; the window and the two lists in
`src/build.ts`, with `recordSeen` on the upcoming list; the spec § 3 and `src/changes.ts` wording.
Tests: a game played inside the window stays in the feed, one played before it leaves, and a played
game is never announced as new.

## Risks

- **UIDs and paths.** Neither changes, and no event is added, so nothing can duplicate.
- **FIBA stops listing played games.** Its played games leave the feed the next day, as they do
  today. Not new: the zero-games check in `src/fiba.ts` already counts on played games being listed,
  and would fail the build for a team with nothing left to play in the event.
- **UEFA's cap.** A wider window brings the one answer closer to 500. Past it the build fails loudly,
  so a window longer than 30 days needs a real count first.
- **A calendar that subscribes after a game** gets that game's reminder set for a time already past.
  Untested; calendars aren't known to fire those.

## For later: results as an opt-in feed

Not built. What we know, for an issue if fans ask:

| | FIBA (games page) | UEFA (one call) |
|---|---|---|
| Finished marker | `statusCode: "VALID"`, `gameResultStatusCode: "VALID"`, `isLive: false`, `liveGameStatus: 999`, `currentPeriodStatus: "E"`. All 48 games still to come in the fixture read `INIT` / `EMPTY` with 0 to 0 | `status: "FINISHED"` |
| Score | `teamAScore`, `teamBScore`, team A at home. The fixture has Greece 108, Spain 106 and Denmark 64, Spain 74 | **Unconfirmed.** The fixtures keep only the fields the parser reads, so no score was ever saved |
| Overtime, penalties | `currentPeriod: "OT1"` on Greece v Spain | Unconfirmed. Penalties only happen in knockout games |
| Not seen in any saved answer | A live game, a postponed one (`isPostponed`), a forfeit (`gameResultAdditionalInformation` reads `"None"` on both played games) | `LIVE`, postponed, abandoned or awarded statuses |

- **Saved answers (#99, #106).** The build saves the raw answers to `source-answers/`, and the Actions
  cache keeps them for push builds. GitHub's API lists cache entries but cannot download them, so
  none were read. They couldn't show a UEFA score anyway, since that answer starts at `today`. Once
  `fromDate` moves back, the run summary could print one finished match to settle its shape.
- **The line.** `Final: Greece 2, Serbia 1` (or `Final: Greece 108, Spain 106 after overtime`),
  second, in place of the `Tickets:` line, so the description stays at six lines. The title stays
  `Greece vs Serbia`: the issue's `Greece 2–1 Serbia` breaks the `SUMMARY` rule in CLAUDE.md and
  docs/calendar-event-spec.md.
- **Delivery.** A result is an in-place update. PR #109 has proven those only on Apple so far, with
  Google and Outlook pending. The daily build starts between about 08:40 and 12:10 UTC
  (docs/spike-build-platform.md), so a result would reach Google calendars a day or more after the
  game.

## Decisions that are Chris's

1. **Results or no results.** Decided on 31 October 2026: played games stay, unchanged, with no
   score.
2. **Keep-window:** 30 days (recommended), 7 days, or the whole competition (UEFA's cap stands in the
   way).
3. **Opt-in results feed:** wait until fans ask (recommended), or open its issue now.
