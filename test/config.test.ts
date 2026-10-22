import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { feedPath, teams } from '../src/config.ts'
import { manual } from '../src/manual.ts'

test('every team has its own frozen feed path, named after the team', () => {
  assert.deepEqual(
    teams.map((team) => [feedPath(team), team.name]),
    [
      ['greece/football.ics', 'Greece football'],
      ['greece/basketball.ics', 'Greece basketball'],
      ['spain/football.ics', 'Spain football'],
      ['spain/basketball.ics', 'Spain basketball'],
      ['france/basketball.ics', 'France basketball'],
      ['germany/basketball.ics', 'Germany basketball'],
    ],
  )
  for (const team of teams) {
    assert.match(team.country, /^[a-z]+(-[a-z]+)*$/, team.name)
    assert.match(team.sport, /^[a-z]+$/, team.name)
    assert.match(team.side, /^[A-Z][a-z]+ men's national (football|basketball) team$/, team.name)
  }
})

test('every team has two or three stripe colours and a flag file', () => {
  for (const team of teams) {
    assert.ok(team.colours.length === 2 || team.colours.length === 3, team.name)
    for (const colour of team.colours) assert.match(colour, /^#[0-9A-F]{6}$/, team.name)
    assert.ok(team.flag, team.name)
    assert.ok(existsSync(new URL(`../assets/${team.flag}`, import.meta.url)), `${team.name}: assets/${team.flag}`)
  }
})

test('source ids and codes fit their source', () => {
  for (const { source, name } of teams) {
    if (source.kind === 'uefa') {
      assert.ok(Number.isInteger(source.teamId) && source.teamId > 0, name)
    } else {
      assert.match(source.event, /^fiba-[a-z0-9-]+$/, name)
      assert.match(source.teamCode, /^[A-Z]{3}$/, name)
    }
  }
})

test('hand-kept ticket links are https pages, and no TV line is a guess', () => {
  for (const { defaults, name } of teams) {
    if (defaults.tickets) assert.match(defaults.tickets, /^https:\/\/[^ ]+$/, name)
    if (defaults.tv) assert.match(defaults.tv, /^[^!?]+ \([A-Z][a-z]+ TV\)$/, name)
  }
})

// Runs before every build, so a typo stops the build instead of shipping a sale on the wrong day.
test('hand-kept game details: ticket links are https pages, on-sale days are real YYYY-MM-DD dates', () => {
  for (const [id, { tickets, onSale }] of Object.entries(manual)) {
    if (tickets) assert.match(tickets, /^https:\/\/[^ ]+$/, id)
    if (onSale === undefined) continue
    assert.match(onSale, /^\d{4}-\d{2}-\d{2}$/, id)
    // "2026-02-30" would roll over to 2 March.
    assert.equal(new Date(`${onSale}T00:00:00Z`).toISOString().slice(0, 10), onSale, id)
  }
})
