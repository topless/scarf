import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { feedPath, teams } from '../src/config.ts'

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
      ['switzerland/football.ics', 'Switzerland football'],
      ['england/football.ics', 'England football'],
      ['germany/football.ics', 'Germany football'],
    ],
  )
  for (const team of teams) {
    assert.match(team.country, /^[a-z]+(-[a-z]+)*$/, team.name)
    assert.match(team.sport, /^[a-z]+$/, team.name)
    assert.match(team.side, /^[A-Z][A-Za-z ]+ men's national (football|basketball) team$/, team.name)
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
