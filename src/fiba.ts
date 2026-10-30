import { fetchText, type Game } from './game.ts'

// FIBA has no public API. The games page of an event embeds every game of that event as JSON
// inside the page's Next.js data, so one request per competition is enough: the page is fetched
// once and parsed for each team playing in it.

interface FibaGame {
  gameId: number
  teamA: { code: string; officialName: string } | null
  teamB: { code: string; officialName: string } | null
  competition: { officialName: string }
  gameDateTime: string // at the venue, no offset; midnight while the time is not announced
  gameDateTimeUTC: string // no "Z" suffix
  hasTimeGameDateTime: boolean
  utcOffset: number | null
  venueName: string | null
  hostCity: string | null
}

export function fetchFibaPage(event: string, saved?: URL): Promise<string> {
  return fetchText(`https://www.fiba.basketball/en/events/${event}/games`, saved)
}

export function parseFibaGames(html: string, teamCode: string): Game[] {
  const chunks = html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)
  const payload = Array.from(chunks, (m) => JSON.parse(`"${m[1]}"`) as string).join('')

  const games = (jsonObjectsStartingWith(payload, '{"gameId":') as FibaGame[]).filter(
    (g) => g.teamA?.code === teamCode || g.teamB?.code === teamCode,
  )
  // The page lists played games too, so a team that is in the event always has some.
  if (games.length === 0) throw new Error(`FIBA page format changed: no games found for ${teamCode}`)

  return games.map((g) => {
    const game: Game = {
      id: `fiba-${g.gameId}`,
      competition: g.competition?.officialName,
      // Later-round games are listed before both teams are known. The home team opens the title.
      home: g.teamA?.officialName ?? 'Opponent not announced',
      away: g.teamB?.officialName ?? 'opponent not announced',
      date: g.gameDateTime?.slice(0, 10),
      kickoff: g.hasTimeGameDateTime ? `${g.gameDateTimeUTC}Z` : undefined,
      utcOffsetHours: g.hasTimeGameDateTime ? (g.utcOffset ?? undefined) : undefined,
      venue: g.venueName?.trim() || undefined,
      city: g.hostCity?.trim() || undefined, // the page has "Farum " for Denmark's home games
    }
    if (!game.competition || !/^\d{4}-\d{2}-\d{2}$/.test(game.date)) {
      throw new Error(`FIBA game format changed: ${JSON.stringify(game)}`)
    }
    return game
  })
}

function jsonObjectsStartingWith(text: string, prefix: string): unknown[] {
  const objects: unknown[] = []
  let from = 0
  for (;;) {
    const start = text.indexOf(prefix, from)
    if (start === -1) return objects
    const end = endOfObject(text, start)
    objects.push(JSON.parse(text.slice(start, end)))
    from = end
  }
}

// Index just past the "}" that closes the object opening at `start`.
function endOfObject(text: string, start: number): number {
  let depth = 0
  let inString = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (ch === '\\') i++
      else if (ch === '"') inString = false
    } else if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}' && --depth === 0) return i + 1
  }
  throw new Error('FIBA page format changed: unterminated game object')
}
