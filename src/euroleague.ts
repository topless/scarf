import { fetchText, type Game } from './game.ts'

// EuroLeague Basketball's own API, the one behind euroleaguebasketball.net: undocumented, but open
// (no key, CORS for every origin, two hours of cache at its edge). One request answers every game of
// a season, played and to come, so the answer is fetched once per season and parsed for each club in
// it. A season code's letter names the competition, in the URL and in each game's line: E for the
// EuroLeague, U for the EuroCup. Probed once each: E2026 on 2026-10-31 (#113), the 380 regular-season
// games of 2026-27 in a 725 KB JSON; U2026 on 2026-11-02 (#115), the 224 regular-season games of the
// EuroCup's four groups of eight in 434 KB. Playoff and final games are not listed until the season
// reaches them.

interface EuroleagueGame {
  identifier: string // "E2026_379", "U2026_12": the season and the game's number in it, unique across seasons
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

// The competitions by a season code's letter, named as each game's line calls it.
const COMPETITIONS: Record<string, string> = { E: 'EuroLeague', U: 'EuroCup' }

export function fetchEuroleagueGames(season: string, saved?: URL): Promise<string> {
  return fetchText(`https://api-live.euroleague.net/v2/competitions/${season[0]}/seasons/${season}/games`, saved)
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
      competition: `${COMPETITIONS[g.identifier?.[0]]} · ${g.roundName}`,
      // Trimmed: the EuroCup writes " Rostock" and "Siauliai ".
      home: g.local.club.abbreviatedName?.trim(),
      away: g.road.club.abbreviatedName?.trim(),
      sides: [`euroleague:${g.local.club.code}`, `euroleague:${g.road.club.code}`],
      date: g.localDate?.slice(0, 10),
      kickoff: g.confirmedHour ? g.utcDate : undefined,
      utcOffsetHours: g.confirmedHour ? g.localTimeZone : undefined,
      venue: venue?.name,
      city: venue?.city,
    }
    if (
      !/^[EU]\d{4}_\d+$/.test(g.identifier ?? '') ||
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
// of the EuroLeague and EuroCup 2026-27 is here; a new one is listed by the API's name, with no city,
// until it is added.
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
  // The EuroCup's (#115).
  AFZ3: { name: 'Alexandreio Melathron', city: 'Thessaloniki' },
  AAI1: { name: 'PAOK Sports Arena', city: 'Thessaloniki' },
  ATK2: { name: 'Sinan Erdem Dome', city: 'Istanbul' },
  ATG2: { name: 'Tofaş Sports Hall', city: 'Bursa' },
  ATT2: { name: 'Ankara Sports Hall', city: 'Ankara' },
  AOR1: { name: 'Palazzetto dello Sport', city: 'Rome' },
  AJK: { name: 'Palazzetto dello Sport', city: 'Rome' }, // AOR1's arena: same name and capacity, AJK the active record, no address
  ACS1: { name: 'PalaEUR', city: 'Rome' },
  AIB1: { name: 'Alcott Arena', city: 'Naples' },
  ATS3: { name: 'BTS Arena', city: 'Trento' },
  AIF1: { name: 'Nova Arena', city: 'Tortona' },
  ARE: { name: 'Palasport Taliercio', city: 'Venice' },
  AII1: { name: 'Coliseum Burgos', city: 'Burgos' },
  AVM1: { name: 'Pavelló Nou Congost', city: 'Manresa' },
  AID1: { name: 'Pabellón Santiago Martín', city: 'La Laguna' },
  AUJ: { name: 'Ekinox', city: 'Bourg-en-Bresse' },
  ACU1: { name: 'Antarès', city: 'Le Mans' },
  ATN1: { name: 'Süwag Energie Arena', city: 'Frankfurt' },
  AVL2: { name: 'Messe Chemnitz', city: 'Chemnitz' },
  AIH2: { name: 'Stadthalle Rostock', city: 'Rostock' },
  ATE6: { name: 'ratiopharm arena', city: 'Ulm' },
  AHX1: { name: 'Zetra Olympic Hall', city: 'Sarajevo' },
  AUA: { name: 'Morača Sports Center', city: 'Podgorica' },
  AUL: { name: 'Ranko Žeravica Sports Hall', city: 'Belgrade' },
  AUV4: { name: 'BT Arena', city: 'Cluj-Napoca' },
  AOL1: { name: 'Švyturio Arena', city: 'Klaipėda' },
  ASS2: { name: 'Kalnapilio Arena', city: 'Panevėžys' },
  AHP1: { name: 'Šiaulių Arena', city: 'Šiauliai' },
  AKX2: { name: 'Arena Stožice', city: 'Ljubljana' },
  AHO2: { name: 'Xiaomi Arena', city: 'Riga' },
  AUW3: { name: 'Copper Box Arena', city: 'London' },
  ACQ2: { name: 'Hala Orbita', city: 'Wrocław' },
}
