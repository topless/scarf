import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fetchEuroleagueGames, parseEuroleagueGames } from '../src/euroleague.ts'
import { parseFibaGames } from '../src/fiba.ts'
import { fetchText } from '../src/game.ts'
import { fetchUefaMatches, parseUefaMatches } from '../src/uefa.ts'

// Both fixtures are cut down from the answers of 2026-10-30 (#76), so every team has a game in them.
// The UEFA one is the 52 matches still to come in the one probe's answer (competitionId=2014, every
// member's Nations League games), cut to the fields the parser reads; the six of the first probe
// (teamId=49,122,35, 2026-10-17) are among them, unchanged. The FIBA one is the qualifiers page's games
// still to come, plus Greece v Spain (played, with time and venue) and Denmark v Spain (its city ends
// in a space), whole, its data split over two chunks inside a game as the page of 2 October was.
// The UEFA one also holds the 126 Champions League matches of the probe of 2026-11-02 (#131: the 36
// clubs' ids, Matchday 2 to 8), cut the same way.
// The EuroLeague one is the 2026-27 answer of 2026-10-31 (#113), all 380 games, played and to come; the
// EuroCup one the 2026-27 answer of 2026-11-02 (#115), all 224; both cut to the fields the parser reads.
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const euroleague = () => fixture('euroleague-games.json')
const eurocup = () => fixture('eurocup-games.json')
const uefa = () => JSON.parse(fixture('uefa-matches.json'))
const ids = (games: { id: string }[]) => games.map((g) => g.id)

test('one UEFA response holds several teams, and each team gets only its own matches', () => {
  assert.deepEqual(ids(parseUefaMatches(uefa(), 49)), ['uefa-2047886', 'uefa-2047912'])
  assert.deepEqual(ids(parseUefaMatches(uefa(), 122)), ['uefa-2047872', 'uefa-2047904'])
  assert.deepEqual(ids(parseUefaMatches(uefa(), 35)), ['uefa-2047892', 'uefa-2047919'])
  // A team with nothing scheduled gets an empty feed, not a failed build.
  assert.deepEqual(parseUefaMatches(uefa(), 1), [])
})

test('UEFA matches become games with kickoff and venue', () => {
  assert.deepEqual(parseUefaMatches(uefa(), 49)[1], {
    id: 'uefa-2047912',
    competition: 'UEFA Nations League',
    home: 'Greece',
    away: 'Serbia',
    date: '2026-11-16',
    kickoff: '2026-11-16T19:45:00Z',
    utcOffsetHours: 2,
    venue: 'Panthessaliko',
    city: 'Volos',
  })
})

test('a Champions League match rides the same answer: the competition as UEFA names it, the venue trimmed', () => {
  const madrid = parseUefaMatches(uefa(), 50051)
  assert.equal(madrid.length, 7) // Matchday 2 to 8
  assert.deepEqual(
    madrid.find((game) => game.id === 'uefa-2049622'),
    {
      id: 'uefa-2049622',
      competition: 'UEFA Champions League',
      home: 'AEK Athens',
      away: 'Real Madrid',
      date: '2026-11-04',
      kickoff: '2026-11-04T17:45:00Z',
      utcOffsetHours: 2,
      venue: 'AEK Arena',
      city: 'Athens',
    },
  )
  // UEFA writes " La Cartuja de Sevilla".
  assert.equal(parseUefaMatches(uefa(), 52265).find((game) => game.id === 'uefa-2049672')!.venue, 'La Cartuja de Sevilla')
})

test('a changed UEFA format fails loudly', () => {
  const match = uefa().find((m: { id: string }) => m.id === '2047872') // Czechia v Spain
  assert.throws(() => parseUefaMatches([{ ...match, kickOffTime: {} }], 122), /format changed/)
  // Without team ids no team could pick out its matches, and every feed would silently empty.
  assert.throws(() => parseUefaMatches([{ ...match, homeTeam: { internationalName: 'Czechia' } }], 122), /format changed/)
})

test('an empty UEFA response fails loudly instead of emptying every football feed', async (t) => {
  // Stubbed: the test makes no request to UEFA.
  t.mock.method(globalThis, 'fetch', async () => new Response('[]'))
  t.mock.method(console, 'log', () => {})
  await assert.rejects(fetchUefaMatches([49, 122], '2026-10-22'), /UEFA returned no matches at all for teamId=49,122/)
})

// The start of a bot-challenge page, as a source may answer it with a 200 instead of a refusal.
const challenge = '<!DOCTYPE html>\n<html lang="en-US">\n  <head>\n    <title>Just a moment...</title>'

test('UEFA answering a web page instead of JSON fails with the start of that page', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(challenge))
  t.mock.method(console, 'log', () => {})
  await assert.rejects(fetchUefaMatches([49], '2026-10-22'), /UEFA's answer is not JSON: it starts "<!DOCTYPE html> <html lang="en-US"> <head> <title>Just a moment\.\.\.<\/title>"/)
})

test('a refused request fails with its status, its retry-after and the start of its answer', async (t) => {
  const answer = new Response('<html>\n  <body>Slow down</body>\n</html>', {
    status: 429,
    statusText: 'Too Many Requests',
    headers: { 'Retry-After': '60', Server: 'cloudflare' },
  })
  t.mock.method(globalThis, 'fetch', async () => answer)
  const log = t.mock.method(console, 'log', () => {})
  await assert.rejects(
    fetchText('https://match.uefa.com/v5/matches'),
    /429 Too Many Requests for https:\/\/match\.uefa\.com\/v5\/matches · retry-after: 60 · the answer starts "<html> <body>Slow down<\/body> <\/html>"/,
  )
  // The step log's line: the headers worth knowing, without the content-type every answer has.
  assert.deepEqual(log.mock.calls.map((call) => call.arguments), [['match.uefa.com answered 429 · retry-after: 60 · server: cloudflare']])
})

test('FIBA page yields only the requested team, with time and venue once announced', () => {
  const games = parseFibaGames(fixture('fiba-games.html'), 'GRE')
  assert.deepEqual(ids(games), ['fiba-127101', 'fiba-127114', 'fiba-127107', 'fiba-127111', 'fiba-127097'])
  assert.deepEqual(games[0], {
    id: 'fiba-127101',
    competition: 'FIBA Basketball World Cup 2027 European Qualifiers',
    home: 'Greece',
    away: 'Spain',
    date: '2026-08-31',
    kickoff: '2026-08-31T16:00:00Z',
    utcOffsetHours: 3,
    venue: 'Telekom Center Athens',
    city: 'Athens',
  })
})

test('the same FIBA page serves every team in the competition', () => {
  const html = fixture('fiba-games.html')
  assert.deepEqual(ids(parseFibaGames(html, 'ESP')), ['fiba-127005', 'fiba-127101', 'fiba-127104', 'fiba-127107', 'fiba-127110', 'fiba-127113'])
  const [denmark] = parseFibaGames(html, 'DEN')
  assert.equal(denmark.id, 'fiba-127005')
  assert.equal(denmark.home, 'Denmark')
  assert.equal(denmark.away, 'Spain')
  assert.equal(denmark.venue, 'Farum Arena')
  assert.equal(denmark.city, 'Farum') // the page says "Farum "
})

test('FIBA game without an announced time has no kickoff or venue', () => {
  const game = parseFibaGames(fixture('fiba-games.html'), 'GRE')[3] // Greece v Ukraine
  assert.equal(game.date, '2027-02-26')
  assert.equal(game.kickoff, undefined)
  assert.equal(game.venue, undefined)
})

test('a FIBA team not known yet reads "opponent not announced", capitalised when it opens the title', () => {
  // Game 127114 as the page of 2 October had it, before its time was out, cut to the fields the
  // parser reads, in a page of its own.
  const georgia = {
    gameId: 127114,
    teamA: { code: 'GRE', officialName: 'Greece' },
    teamB: { code: 'GEO', officialName: 'Georgia' },
    competition: { officialName: 'FIBA Basketball World Cup 2027 European Qualifiers' },
    gameDateTime: '2026-11-26T00:00:00',
    gameDateTimeUTC: '2026-11-26T00:00:00',
    hasTimeGameDateTime: false,
    utcOffset: null,
    venueName: null,
    hostCity: null,
  }
  const page = (game: object) => `<script>self.__next_f.push([1,${JSON.stringify(JSON.stringify(game))}])</script>`
  const [away] = parseFibaGames(page({ ...georgia, teamB: null }), 'GRE')
  assert.equal(`${away.home} vs ${away.away}`, 'Greece vs opponent not announced')
  const [home] = parseFibaGames(page({ ...georgia, teamA: null, teamB: georgia.teamA }), 'GRE')
  assert.equal(`${home.home} vs ${home.away}`, 'Opponent not announced vs Greece')
})

test('a FIBA page without games for the team fails loudly instead of emptying the calendar', () => {
  assert.throws(() => parseFibaGames('<html><body>Just a moment...</body></html>', 'GRE'), /format changed/)
  assert.throws(() => parseFibaGames(fixture('fiba-games.html'), 'GRC'), /no games found for GRC/)
})

test('a FIBA page with no games quotes its start, so a bot challenge reads as one', () => {
  assert.throws(() => parseFibaGames(challenge, 'GRE'), /no games found for GRE, and the page starts "<!DOCTYPE html> <html lang="en-US"> <head> <title>Just a moment\.\.\.<\/title>"/)
})

test("UEFA's Türkiye loses the stray dot over its i", () => {
  const games = parseUefaMatches(uefa(), 135)
  assert.ok(games.length > 0)
  for (const game of games) assert.ok([game.home, game.away].includes('Türkiye'), `${game.home} vs ${game.away}`)
})

test('one EuroLeague season answers for every club in it, and each club gets only its own games', () => {
  const olympiacos = parseEuroleagueGames(euroleague(), 'OLY')
  const panathinaikos = parseEuroleagueGames(euroleague(), 'PAN')
  assert.equal(olympiacos.length, 38)
  assert.ok(olympiacos.every((game) => game.home === 'Olympiacos' || game.away === 'Olympiacos'))
  // The two derbies are in both lists under one id each, so they land in both feeds as the same event.
  assert.equal(new Set([...olympiacos, ...panathinaikos].map((game) => game.id)).size, 74)
  // A club that is not in the season fails the build rather than publishing an empty feed.
  assert.throws(() => parseEuroleagueGames(euroleague(), 'XXX'), /no games for XXX/)
})

test('EuroLeague games become games with tip-off, the arena and its city, the clubs named without sponsors', () => {
  const game = parseEuroleagueGames(euroleague(), 'OLY').find((game) => game.id === 'euroleague-E2026_100')
  assert.deepEqual(game, {
    id: 'euroleague-E2026_100',
    competition: 'EuroLeague · Round 10',
    home: 'Olympiacos',
    away: 'Crvena Zvezda',
    date: '2026-11-06',
    kickoff: '2026-11-06T19:15:00Z',
    utcOffsetHours: 2,
    venue: 'SUNEL Arena',
    city: 'Athens',
  })
})

test('a changed EuroLeague format fails loudly; an arena not yet listed keeps the API name and no city', () => {
  const game = JSON.parse(euroleague()).data.find((game: { identifier: string }) => game.identifier === 'E2026_100')
  const answer = (changed: object) => JSON.stringify({ data: [{ ...game, ...changed }] })
  assert.throws(() => parseEuroleagueGames(answer({ utcDate: '2026-11-06T19:15:00' }), 'OLY'), /format changed/)
  assert.throws(() => parseEuroleagueGames(answer({ roundName: undefined }), 'OLY'), /format changed/)
  assert.throws(() => parseEuroleagueGames(JSON.stringify({ games: [] }), 'OLY'), /format changed/)
  assert.throws(() => parseEuroleagueGames(answer({ identifier: 'X2026_100' }), 'OLY'), /format changed/) // a competition we do not know
  const unlisted = parseEuroleagueGames(answer({ venue: { code: 'NEW1', name: 'NEW ARENA' } }), 'OLY')[0]!
  assert.deepEqual([unlisted.venue, unlisted.city], ['NEW ARENA', undefined])
  // No time yet: an all-day placeholder on the day, as for the other sources.
  const unscheduled = parseEuroleagueGames(answer({ confirmedHour: false }), 'OLY')[0]!
  assert.deepEqual([unscheduled.date, unscheduled.kickoff, unscheduled.utcOffsetHours], ['2026-11-06', undefined, undefined])
})

test("a season code's letter names the competition in the request: E the EuroLeague, U the EuroCup", async (t) => {
  // Stubbed: the test makes no request to the EuroLeague API.
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('{"data":[]}'))
  t.mock.method(console, 'log', () => {})
  await fetchEuroleagueGames('E2026')
  await fetchEuroleagueGames('U2026')
  assert.deepEqual(
    fetch.mock.calls.map((call) => String(call.arguments[0])),
    ['https://api-live.euroleague.net/v2/competitions/E/seasons/E2026/games', 'https://api-live.euroleague.net/v2/competitions/U/seasons/U2026/games'],
  )
})

test('EuroCup games read as EuroLeague ones do, with their own competition line and the names trimmed', () => {
  const rostock = parseEuroleagueGames(eurocup(), 'RTK')
  assert.equal(rostock.length, 14) // a group of eight, home and away
  assert.deepEqual(
    rostock.find((game) => game.id === 'euroleague-U2026_114'),
    {
      id: 'euroleague-U2026_114',
      competition: 'EuroCup · Round 8',
      home: 'Rostock', // the API writes " Rostock"
      away: 'Hapoel JLM',
      date: '2026-11-17',
      kickoff: '2026-11-17T19:00:00Z',
      utcOffsetHours: 1,
      venue: 'Stadthalle Rostock',
      city: 'Rostock',
    },
  )
  // Every arena of either season has its name and city, so every time names its city.
  for (const answer of [euroleague(), eurocup()]) {
    const codes = new Set<string>(JSON.parse(answer).data.map((game: { local: { club: { code: string } } }) => game.local.club.code))
    const unplaced = [...codes].flatMap((code) => parseEuroleagueGames(answer, code)).filter((game) => !game.city)
    assert.deepEqual(unplaced.map((game) => game.venue), [])
  }
})
