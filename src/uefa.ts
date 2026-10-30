import { fetchText, type Game } from './game.ts'

// Undocumented endpoint behind uefa.com's fixtures pages. `teamId` takes a comma-separated list
// and answers with every match of any listed team (probed once on 2026-10-17 with
// teamId=49,122,35: six matches, two per team), so one call a day covers every football team:
// Nations League, qualifiers and friendlies. Each team then picks its own matches out of it.
// With every UEFA member on scarf the call holds every European national-team match to the end of the
// year after next, some 250 a year once qualifiers are drawn. Asked for limit=500 on 2026-10-30 (#76,
// competitionId=2014), UEFA answered with all 156 games of the Nations League 2026-27 league phase,
// so one answer can hold more than the 100 the first probes asked for.
// shortcut: a full 500 is untested, and a quiet cap between 156 and 500 would drop the latest matches
// without failing; print the match count in the run summary if that ever needs ruling out.
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
  const url = `https://match.uefa.com/v5/matches?teamId=${teamIds.join(',')}&fromDate=${today}&toDate=${to}&limit=${LIMIT}&offset=0&order=ASC`
  const matches = JSON.parse(await fetchText(url, saved)) as UefaMatch[]
  if (!Array.isArray(matches)) throw new Error('UEFA response format changed: not a list of matches')
  // One team may have nothing scheduled; no match for any team means the request stopped working.
  if (matches.length === 0) throw new Error(`UEFA returned no matches at all for teamId=${teamIds.join(',')}: the request may have stopped working`)
  if (matches.length >= LIMIT) throw new Error(`UEFA returned ${LIMIT} matches; paging is needed`)
  return matches
}

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
        home: m.homeTeam.internationalName,
        away: m.awayTeam.internationalName,
        date: m.kickOffTime.date,
        kickoff: m.kickOffTime.dateTime,
        utcOffsetHours: m.kickOffTime.utcOffsetInHours,
        venue: m.stadium?.translations?.officialName?.EN,
        city: m.stadium?.city?.translations?.name?.EN,
      }
      if (!m.id || !game.competition || !game.home || !game.away || !/^\d{4}-\d{2}-\d{2}$/.test(game.date)) {
        throw new Error(`UEFA match format changed: ${JSON.stringify(game)}`)
      }
      return game
    })
}
