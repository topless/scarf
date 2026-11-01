import { fetchText, type Game } from './game.ts'

// EuroLeague Basketball's own API, the one behind euroleaguebasketball.net: undocumented, but open
// (no key, CORS for every origin, two hours of cache at its edge). One request answers every game of
// a season, played and to come, so the answer is fetched once per season and parsed for each club in
// it. Probed once on 2026-10-31 (#113): the 380 regular-season games of 2026-27 in a 725 KB JSON.
// Playoff and Final Four games are not listed until the season reaches them.

interface EuroleagueGame {
  identifier: string // "E2026_379": the season and the game's number in it, unique across seasons
  roundName: string // "Round 10"
  utcDate: string // "2026-11-06T19:15:00Z"
  localDate: string // at the venue, no offset
  localTimeZone: number // the venue's offset from UTC at tip-off, in hours
  confirmedHour: boolean // false while the time is not announced
  local: { club: EuroleagueClub } // the home side
  road: { club: EuroleagueClub }
  venue: { code: string; name: string } | null
}

interface EuroleagueClub {
  code: string // "OLY", the code config.ts names
  abbreviatedName: string // "Olympiacos": the club without its sponsor and city ("Olympiacos Piraeus")
}

export function fetchEuroleagueGames(season: string, saved?: URL): Promise<string> {
  return fetchText(`https://api-live.euroleague.net/v2/competitions/E/seasons/${season}/games`, saved)
}

export function parseEuroleagueGames(json: string, clubCode: string): Game[] {
  const answer = JSON.parse(json) as { data?: EuroleagueGame[] }
  if (!Array.isArray(answer.data)) throw new Error('EuroLeague response format changed: not a list of games')
  const games = answer.data.filter((g) => g.local?.club?.code === clubCode || g.road?.club?.code === clubCode)
  // The season lists played games too, so a club that is in it always has some.
  if (games.length === 0) throw new Error(`EuroLeague season has no games for ${clubCode}: the club code or the season may be wrong`)
  return games.map((g) => {
    const venue = g.venue && (VENUES[g.venue.code] ?? { name: g.venue.name })
    const game: Game = {
      id: `euroleague-${g.identifier}`,
      competition: `EuroLeague · ${g.roundName}`,
      home: g.local.club.abbreviatedName,
      away: g.road.club.abbreviatedName,
      date: g.localDate?.slice(0, 10),
      kickoff: g.confirmedHour ? g.utcDate : undefined,
      utcOffsetHours: g.confirmedHour ? g.localTimeZone : undefined,
      venue: venue?.name,
      city: venue?.city,
    }
    if (
      !/^E\d{4}_\d+$/.test(g.identifier ?? '') ||
      !g.roundName ||
      !game.home ||
      !game.away ||
      !/^\d{4}-\d{2}-\d{2}$/.test(game.date) ||
      (game.kickoff !== undefined && (!game.kickoff.endsWith('Z') || typeof game.utcOffsetHours !== 'number'))
    ) {
      throw new Error(`EuroLeague game format changed: ${JSON.stringify(game)}`)
    }
    return game
  })
}

// The arenas by the API's venue code, as each arena calls itself and with the city fans name: the API
// writes "SUNEL ARENA" and a street address, and a time on scarf always names its city. Every arena
// of 2026-27 is here; a new one is listed by the API's name, with no city, until it is added.
const VENUES: Record<string, { name: string; city: string }> = {
  AMH: { name: 'Palau Blaugrana', city: 'Barcelona' },
  ASF6: { name: 'Peace and Friendship Stadium', city: 'Piraeus' },
  AVT1: { name: 'SUNEL Arena', city: 'Athens' },
  AUM6: { name: 'Telekom Center Athens', city: 'Athens' },
  AVG2: { name: 'Turkcell Basketball Development Center', city: 'Istanbul' },
  AMY: { name: 'Ülker Sports and Event Hall', city: 'Istanbul' },
  ACA4: { name: 'Coca-Cola Arena', city: 'Dubai' },
  AVB11: { name: 'Adidas Arena', city: 'Paris' },
  AKW2: { name: 'Accor Arena', city: 'Paris' },
  AUF4: { name: 'Aleksandar Nikolić Hall', city: 'Belgrade' },
  ATM8: { name: 'Belgrade Arena', city: 'Belgrade' },
  ATJ: { name: 'Žalgirio Arena', city: 'Kaunas' },
  AVJ1: { name: 'Roig Arena', city: 'Valencia' },
  ASX8: { name: 'Unipol Forum', city: 'Milan' },
  AVE1: { name: 'SAP Garden', city: 'Munich' },
  AUZ1: { name: 'LDLC Arena', city: 'Lyon' },
  ASR: { name: 'Astroballe', city: 'Villeurbanne' },
  AVK1: { name: 'Arena 8888 Sofia', city: 'Sofia' },
  AVN2: { name: 'Arena Botevgrad', city: 'Botevgrad' },
  ATI7: { name: 'Movistar Arena', city: 'Madrid' },
  AUK3: { name: 'Virtus Arena', city: 'Bologna' },
  AIG: { name: 'PalaDozza', city: 'Bologna' },
  AUC: { name: 'Buesa Arena', city: 'Vitoria-Gasteiz' },
}
