import assert from 'node:assert/strict'
import { test } from 'node:test'
import { announced, recordSeen } from '../src/known-games.ts'

test('the first build of a team seeds every game and announces none', () => {
  const { feed, fresh } = recordSeen(undefined, ['uefa-1', 'uefa-2'], '2026-10-18')
  assert.deepEqual(feed, { seeded: '2026-10-18', games: { 'uefa-1': '2026-10-18', 'uefa-2': '2026-10-18' } })
  assert.deepEqual(fresh, [])
  assert.deepEqual(announced(feed), {})
})

test('a game seen for the first time gets today, is reported, and stays announced on that day', () => {
  const seeded = recordSeen(undefined, ['uefa-1'], '2026-10-18').feed
  const { feed, fresh } = recordSeen(seeded, ['uefa-1', 'uefa-3'], '2026-10-20')
  assert.deepEqual(fresh, ['uefa-3'])
  assert.deepEqual(feed, { seeded: '2026-10-18', games: { 'uefa-1': '2026-10-18', 'uefa-3': '2026-10-20' } })
  assert.deepEqual(announced(feed), { 'uefa-3': '2026-10-20' })
  // The next day nothing is new; the state and the announcement date hold.
  const later = recordSeen(feed, ['uefa-1', 'uefa-3'], '2026-10-21')
  assert.deepEqual(later.fresh, [])
  assert.deepEqual(later.feed, feed)
  assert.deepEqual(announced(later.feed), { 'uefa-3': '2026-10-20' })
})

test('a game that leaves the feed stays known, so its return is not an announcement', () => {
  const seeded = recordSeen(undefined, ['fiba-1', 'fiba-2'], '2026-10-18').feed
  const without = recordSeen(seeded, ['fiba-1'], '2026-10-19').feed
  assert.deepEqual(Object.keys(without.games), ['fiba-1', 'fiba-2'])
  assert.deepEqual(recordSeen(without, ['fiba-1', 'fiba-2'], '2026-10-20').fresh, [])
})
