import assert from 'node:assert/strict'
import { test } from 'node:test'
import { feedChanges } from '../src/changes.ts'
import { teams } from '../src/config.ts'
import type { Game } from '../src/game.ts'
import { toIcs } from '../src/ics.ts'

const [football] = teams
const yesterday = new Date('2026-10-02T06:00:00Z')
const today = new Date('2026-10-03T06:00:00Z')
const game: Game = {
  id: 'uefa-1',
  competition: 'UEFA Nations League',
  home: 'Greece',
  away: 'Germany',
  date: '2026-10-04',
  kickoff: '2026-10-04T18:45:00Z',
  utcOffsetHours: 3,
  venue: 'Toumba Stadium',
  city: 'Thessaloniki',
  tv: 'Alpha',
}
const feed = (games: Game[], now = today) => toIcs(football!, games, now)

test('a rebuild that only restamps DTSTAMP changes nothing', () => {
  assert.deepEqual(feedChanges(feed([game], yesterday), feed([game]), '2026-10-03'), [])
})

test('a moved kickoff reads as the description line that changed, with its city', () => {
  const moved = { ...game, kickoff: '2026-10-04T19:45:00Z' }
  assert.deepEqual(feedChanges(feed([game]), feed([moved]), '2026-10-03'), [
    'Changed: Greece vs Germany: start 2026-10-04 18:45 UTC → 2026-10-04 19:45 UTC; Kickoff 21:45 in Thessaloniki → Kickoff 22:45 in Thessaloniki',
  ])
})

test('new, dropped and played games are told apart', () => {
  const later: Game = { id: 'uefa-2', competition: 'UEFA Nations League', home: 'Greece', away: 'Georgia', date: '2026-11-26' }
  const played: Game = { ...game, id: 'uefa-0', away: 'Spain', date: '2026-10-01', kickoff: '2026-10-01T18:45:00Z' }
  assert.deepEqual(feedChanges(feed([played, game]), feed([later]), '2026-10-03'), [
    'Added: Greece vs Georgia · time not announced on 2026-11-26',
    'Removed: Greece vs Germany on 2026-10-04',
    '1 played game left the feed',
  ])
})

test('an empty live feed lists every game as added', () => {
  assert.deepEqual(feedChanges('', feed([game]), '2026-10-03'), ['Added: Greece vs Germany on 2026-10-04'])
})
