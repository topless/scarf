import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseFibaGames } from '../src/fiba.ts'
import { fetchUefaMatches, parseUefaMatches } from '../src/uefa.ts'

// Both fixtures are cut down from real responses: the UEFA one from the single batched probe of
// 2026-10-17 (teamId=49,122,35), the FIBA one from the 2027 qualifiers page on 2026-10-02.
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
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

test('a changed UEFA format fails loudly', () => {
  const [match] = uefa()
  assert.throws(() => parseUefaMatches([{ ...match, kickOffTime: {} }], 122), /format changed/)
  // Without team ids no team could pick out its matches, and every feed would silently empty.
  assert.throws(() => parseUefaMatches([{ ...match, homeTeam: { internationalName: 'Czechia' } }], 122), /format changed/)
})

test('an empty UEFA response fails loudly instead of emptying every football feed', async (t) => {
  // Stubbed: the test makes no request to UEFA.
  t.mock.method(globalThis, 'fetch', async () => new Response('[]'))
  await assert.rejects(fetchUefaMatches([49, 122], '2026-10-22'), /UEFA returned no matches at all for teamId=49,122/)
})

test('FIBA page yields only the requested team, with time and venue once announced', () => {
  const games = parseFibaGames(fixture('fiba-games.html'), 'GRE')
  assert.deepEqual(ids(games), ['fiba-127101', 'fiba-127114', 'fiba-127107'])
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
  assert.deepEqual(ids(parseFibaGames(html, 'ESP')), ['fiba-127101', 'fiba-127107', 'fiba-127005'])
  const [denmark] = parseFibaGames(html, 'DEN')
  assert.equal(denmark.id, 'fiba-127005')
  assert.equal(denmark.home, 'Denmark')
  assert.equal(denmark.away, 'Spain')
  assert.equal(denmark.venue, 'Farum Arena')
  assert.equal(denmark.city, 'Farum') // the page says "Farum "
})

test('FIBA game without an announced time has no kickoff or venue', () => {
  const game = parseFibaGames(fixture('fiba-games.html'), 'GRE')[1]
  assert.equal(game.date, '2026-11-26')
  assert.equal(game.kickoff, undefined)
  assert.equal(game.venue, undefined)
})

test('a FIBA team not known yet reads "opponent not announced", capitalised when it opens the title', () => {
  // Game 127114 of the fixture, cut to the fields the parser reads, in a page of its own.
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
