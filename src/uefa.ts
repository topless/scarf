import { fetchText, keptSince, startOf, type Game } from './game.ts'

// Undocumented endpoint behind uefa.com's fixtures pages. `teamId` takes a comma-separated list
// and answers with every match of any listed team (probed once on 2026-10-17 with
// teamId=49,122,35: six matches, two per team), so one call a day covers every football team:
// Nations League, qualifiers and friendlies. Each team then picks its own matches out of it.
// With every UEFA member on scarf the call holds every European national-team match from PLAYED_DAYS
// ago (game.ts) to the end of the year after next, some 250 a year once qualifiers are drawn. The
// played ones come back as status "FINISHED" with the same fields, and stay in the feeds as they were. Asked for limit=500 on 2026-10-30 (#76,
// competitionId=2014), UEFA answered with all 156 games of the Nations League 2026-27 league phase,
// so one answer can hold more than the 100 the first probes asked for.
// Clubs share the national teams' id space, so the Champions League clubs ride the same request (#131):
// on 2026-11-02 teamId=49,50051 answered Greece's matches and Real Madrid's, and the 36 clubs' ids
// (a match's group.teams lists them) answered the 126 league-phase matches from Matchday 2 to 8.
// limit=1000 was refused that day ("1000 is not valid for limit", HTTP 400), so 500 stays the most
// one answer holds: some 86 Nations League matches and the clubs' 126 now, more once qualifiers
// are drawn and knockout ties appear.
// shortcut: a full 500 is untested, and a quiet cap between 156 and 500 would drop the latest matches
// without failing; the run summary prints the match count, so watch it there before PLAYED_DAYS grows.
const LIMIT = 500 // a response this long may have been cut

export interface UefaMatch {
  id: string
  homeTeam: { id: string; internationalName: string }
  awayTeam: { id: string; internationalName: string }
  competition: { metaData: { name: string } }
  kickOffTime: { date: string; dateTime?: string; utcOffsetInHours?: number }
  stadium?: {
    translations?: { officialName?: { EN?: string } }
    city?: { translations?: { name?: { EN?: string } } }
  }
}

export async function fetchUefaMatches(teamIds: number[], today: string, saved?: URL): Promise<UefaMatch[]> {
  const to = `${Number(today.slice(0, 4)) + 2}-12-31`
  const url = `https://match.uefa.com/v5/matches?teamId=${teamIds.join(',')}&fromDate=${keptSince(today)}&toDate=${to}&limit=${LIMIT}&offset=0&order=ASC`
  const text = await fetchText(url, saved)
  let matches: UefaMatch[]
  try {
    matches = JSON.parse(text)
  } catch (error) {
    throw new Error(`UEFA's answer is not JSON: it starts "${startOf(text)}"`, { cause: error })
  }
  if (!Array.isArray(matches)) throw new Error('UEFA response format changed: not a list of matches')
  // One team may have nothing scheduled; no match for any team means the request stopped working.
  if (matches.length === 0) throw new Error(`UEFA returned no matches at all for teamId=${teamIds.join(',')}: the request may have stopped working`)
  if (matches.length >= LIMIT) throw new Error(`UEFA returned ${LIMIT} matches; paging is needed`)
  return matches
}

// UEFA writes Türkiye with a combining dot over its i (U+0307, what lowercasing a capital İ leaves),
// which calendars show as a second dot.
const undotted = (name: string) => name?.replace(/i\u0307/g, 'i')

// One team's games out of a response that holds the matches of every team asked for.
export function parseUefaMatches(matches: UefaMatch[], teamId: number): Game[] {
  const id = String(teamId)
  return matches
    .filter((m) => {
      if (!m.homeTeam?.id || !m.awayTeam?.id) throw new Error(`UEFA match format changed: no team ids in ${JSON.stringify(m)}`)
      return m.homeTeam.id === id || m.awayTeam.id === id
    })
    .map((m) => {
      const game: Game = {
        id: `uefa-${m.id}`,
        competition: m.competition.metaData.name,
        home: undotted(m.homeTeam.internationalName),
        away: undotted(m.awayTeam.internationalName),
        sides: [`uefa:${m.homeTeam.id}`, `uefa:${m.awayTeam.id}`],
        date: m.kickOffTime.date,
        kickoff: m.kickOffTime.dateTime,
        utcOffsetHours: m.kickOffTime.utcOffsetInHours,
        // Trimmed: UEFA writes " La Cartuja de Sevilla" and "Národný futbalový štadión ".
        venue: m.stadium?.translations?.officialName?.EN?.trim(),
        city: m.stadium?.city?.translations?.name?.EN?.trim(),
      }
      if (!m.id || !game.competition || !game.home || !game.away || !/^\d{4}-\d{2}-\d{2}$/.test(game.date)) {
        throw new Error(`UEFA match format changed: ${JSON.stringify(game)}`)
      }
      return game
    })
}
