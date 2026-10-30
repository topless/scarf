import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { feedPath, teams } from '../src/config.ts'
import { flagFile } from '../src/flags.ts'
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
      ['switzerland/football.ics', 'Switzerland football'],
      ['england/football.ics', 'England football'],
      ['germany/football.ics', 'Germany football'],
      ['albania/football.ics', 'Albania football'],
      ['andorra/football.ics', 'Andorra football'],
      ['armenia/football.ics', 'Armenia football'],
      ['austria/football.ics', 'Austria football'],
      ['azerbaijan/football.ics', 'Azerbaijan football'],
      ['belarus/football.ics', 'Belarus football'],
      ['belgium/football.ics', 'Belgium football'],
      ['bosnia-and-herzegovina/football.ics', 'Bosnia and Herzegovina football'],
      ['bulgaria/football.ics', 'Bulgaria football'],
      ['croatia/football.ics', 'Croatia football'],
      ['cyprus/football.ics', 'Cyprus football'],
      ['czechia/football.ics', 'Czechia football'],
      ['denmark/football.ics', 'Denmark football'],
      ['estonia/football.ics', 'Estonia football'],
      ['faroe-islands/football.ics', 'Faroe Islands football'],
      ['finland/football.ics', 'Finland football'],
      ['france/football.ics', 'France football'],
      ['georgia/football.ics', 'Georgia football'],
      ['gibraltar/football.ics', 'Gibraltar football'],
      ['hungary/football.ics', 'Hungary football'],
      ['iceland/football.ics', 'Iceland football'],
      ['israel/football.ics', 'Israel football'],
      ['italy/football.ics', 'Italy football'],
      ['kazakhstan/football.ics', 'Kazakhstan football'],
      ['kosovo/football.ics', 'Kosovo football'],
      ['latvia/football.ics', 'Latvia football'],
      ['liechtenstein/football.ics', 'Liechtenstein football'],
      ['lithuania/football.ics', 'Lithuania football'],
      ['luxembourg/football.ics', 'Luxembourg football'],
      ['malta/football.ics', 'Malta football'],
      ['moldova/football.ics', 'Moldova football'],
      ['montenegro/football.ics', 'Montenegro football'],
      ['netherlands/football.ics', 'Netherlands football'],
      ['north-macedonia/football.ics', 'North Macedonia football'],
      ['northern-ireland/football.ics', 'Northern Ireland football'],
      ['norway/football.ics', 'Norway football'],
      ['poland/football.ics', 'Poland football'],
      ['portugal/football.ics', 'Portugal football'],
      ['republic-of-ireland/football.ics', 'Republic of Ireland football'],
      ['romania/football.ics', 'Romania football'],
      ['san-marino/football.ics', 'San Marino football'],
      ['scotland/football.ics', 'Scotland football'],
      ['serbia/football.ics', 'Serbia football'],
      ['slovakia/football.ics', 'Slovakia football'],
      ['slovenia/football.ics', 'Slovenia football'],
      ['sweden/football.ics', 'Sweden football'],
      ['turkiye/football.ics', 'Türkiye football'],
      ['ukraine/football.ics', 'Ukraine football'],
      ['wales/football.ics', 'Wales football'],
      ['bosnia-and-herzegovina/basketball.ics', 'Bosnia and Herzegovina basketball'],
      ['croatia/basketball.ics', 'Croatia basketball'],
      ['estonia/basketball.ics', 'Estonia basketball'],
      ['finland/basketball.ics', 'Finland basketball'],
      ['georgia/basketball.ics', 'Georgia basketball'],
      ['hungary/basketball.ics', 'Hungary basketball'],
      ['iceland/basketball.ics', 'Iceland basketball'],
      ['israel/basketball.ics', 'Israel basketball'],
      ['italy/basketball.ics', 'Italy basketball'],
      ['latvia/basketball.ics', 'Latvia basketball'],
      ['lithuania/basketball.ics', 'Lithuania basketball'],
      ['montenegro/basketball.ics', 'Montenegro basketball'],
      ['netherlands/basketball.ics', 'Netherlands basketball'],
      ['poland/basketball.ics', 'Poland basketball'],
      ['portugal/basketball.ics', 'Portugal basketball'],
      ['serbia/basketball.ics', 'Serbia basketball'],
      ['slovenia/basketball.ics', 'Slovenia basketball'],
      ['sweden/basketball.ics', 'Sweden basketball'],
      ['turkiye/basketball.ics', 'Türkiye basketball'],
      ['ukraine/basketball.ics', 'Ukraine basketball'],
    ],
  )
  for (const team of teams) {
    assert.match(team.country, /^[a-z]+(-[a-z]+)*$/, team.name)
    assert.match(team.sport, /^[a-z]+$/, team.name)
    assert.match(team.side, /^\p{Lu}[\p{L} ]+ men's national (football|basketball) team$/u, team.name) // "Türkiye"
  }
  // One feed per country and sport: two entries for one team would write the same files twice.
  assert.equal(new Set(teams.map(feedPath)).size, teams.length)
})

test('every team has two or three stripe colours and a flag that flag-icons ships', () => {
  for (const team of teams) {
    assert.ok(team.colours.length === 2 || team.colours.length === 3, team.name)
    for (const colour of team.colours) assert.match(colour, /^#[0-9A-F]{6}$/, team.name)
    // The first is the calendar colour, and a white calendar reads as no colour at all.
    assert.notEqual(team.colours[0], '#FFFFFF', team.name)
    assert.match(team.flag, /^[a-z]{2}(-[a-z]{2,3})?$/, team.name)
    assert.ok(existsSync(flagFile(team.flag)), `${team.name}: flag-icons has no flag for the code "${team.flag}"`)
  }
})

// The landing card and the country page draw a country from its first team, so its teams agree.
test("a country's teams share its name, stripes and flag", () => {
  for (const team of teams) {
    const first = teams.find((other) => other.country === team.country)!
    assert.deepEqual([team.name.replace(/ \w+$/, ''), team.colours, team.flag], [first.name.replace(/ \w+$/, ''), first.colours, first.flag], team.name)
  }
})

test('source ids and codes fit their source, each team its own', () => {
  for (const { source, name } of teams) {
    if (source.kind === 'uefa') {
      assert.ok(Number.isInteger(source.teamId) && source.teamId > 0, name)
    } else {
      assert.match(source.event, /^fiba-[a-z0-9-]+$/, name)
      assert.match(source.teamCode, /^[A-Z]{3}$/, name)
    }
  }
  // Two teams on one id would show the same games twice under two names.
  const ids = teams.map(({ source }) => (source.kind === 'uefa' ? `uefa ${source.teamId}` : `${source.event} ${source.teamCode}`))
  assert.equal(new Set(ids).size, teams.length)
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
