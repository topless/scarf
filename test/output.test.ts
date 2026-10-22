import assert from 'node:assert/strict'
import { test } from 'node:test'
import { teams } from '../src/config.ts'
import { withDetails, type Game } from '../src/game.ts'
import { toIcs } from '../src/ics.ts'

const now = new Date('2026-10-02T06:00:00Z')
const [football, basketball] = teams

const timed: Game = {
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
  tickets: 'https://tickets.example/a?b=1&c=2',
}
const unscheduled: Game = { id: 'fiba-2', competition: 'Qualifiers', home: 'Greece', away: 'Georgia', date: '2026-11-26' }

// Long lines are folded in the file; join them back so a header can be asserted as one line.
const icsLines = (ics: string) => ics.replaceAll(/\r\n[ \t]/g, '').split('\r\n')

test('manual details fill gaps, and the source wins once it has its own values', () => {
  const manual = { kickoff: '2026-11-26T17:00:00Z', venue: 'Manual Arena', tickets: 'https://tickets.example/manual' }
  const defaults = { tv: 'ERT', tickets: 'https://tickets.example/default' }

  const filled = withDetails(unscheduled, defaults, manual)
  assert.equal(filled.kickoff, '2026-11-26T17:00:00Z')
  assert.equal(filled.venue, 'Manual Arena')
  assert.equal(filled.tv, 'ERT')
  assert.equal(filled.tickets, 'https://tickets.example/manual')

  const announced = withDetails({ ...unscheduled, kickoff: '2026-11-26T18:30:00Z', venue: 'Official Arena' }, defaults, manual)
  assert.equal(announced.kickoff, '2026-11-26T18:30:00Z')
  assert.equal(announced.venue, 'Official Arena')
})

test('feed header names the team then the brand, and carries the team colour', () => {
  const lines = icsLines(toIcs(football, [timed], now))
  assert.ok(lines.includes('PRODID:-//scarf//feeds//EN'))
  assert.ok(lines.includes('X-WR-CALNAME:Greece football · scarf'))
  assert.ok(
    lines.includes(
      "X-WR-CALDESC:Every game of the Greece men's national football team — kickoff, venue, TV, tickets. Kept up to date by scarf.",
    ),
  )
  assert.ok(lines.includes('X-APPLE-CALENDAR-COLOR:#0D5EAF'))
  assert.ok(lines.includes('REFRESH-INTERVAL;VALUE=DURATION:PT12H'))
})

test('calendar has a timed event in UTC and an all-day placeholder while the time is unknown', () => {
  const lines = icsLines(toIcs(football, [timed, unscheduled], now))
  assert.ok(lines.includes('UID:uefa-1@scarf'))
  assert.ok(lines.includes('DTSTART:20261004T184500Z'))
  assert.ok(lines.includes('DTEND:20261004T204500Z'))
  assert.ok(lines.includes('SUMMARY:Greece vs Germany'))
  assert.ok(lines.includes('LOCATION:Toumba Stadium\\, Thessaloniki'))
  assert.ok(lines.includes('TRIGGER:-PT1H'))
  assert.ok(lines.includes('UID:fiba-2@scarf'))
  assert.ok(lines.includes('DTSTART;VALUE=DATE:20261126'))
  assert.ok(lines.includes('SUMMARY:Greece vs Georgia · time not announced'))
  assert.equal(lines.filter((l) => l === 'BEGIN:VALARM').length, 1)
})

// One VEVENT, unfolded, with the stamp line dropped so the assertion reads like the spec.
const vevent = (ics: string, uid: string) => {
  const lines = icsLines(ics)
  const start = lines.indexOf(`UID:${uid}`) - 1
  return lines.slice(start, lines.indexOf('END:VEVENT', start) + 1).filter((l) => !l.startsWith('DTSTAMP:'))
}

// The spec's sample games (docs/calendar-event-spec.md), with "vs" between the teams.
const serbia: Game = {
  id: 'uefa-2047926',
  competition: 'UEFA Nations League',
  home: 'Greece',
  away: 'Serbia',
  date: '2026-11-16',
  kickoff: '2026-11-16T19:45:00Z',
  utcOffsetHours: 2,
  venue: 'Panthessaliko Stadium',
  city: 'Volos',
  tv: 'Alpha, Novasports (Greek TV)',
  tickets: 'https://www.pame-ethniki.gr/gnfc/showProductList.html',
}
const ukraine: Game = {
  id: 'fiba-127100',
  competition: 'FIBA Basketball World Cup 2027 European Qualifiers',
  home: 'Greece',
  away: 'Ukraine',
  date: '2027-02-26',
}

test('a timed game reads as the spec writes it', () => {
  assert.deepEqual(vevent(toIcs(football, [serbia], now), 'uefa-2047926@scarf'), [
    'BEGIN:VEVENT',
    'UID:uefa-2047926@scarf',
    'SEQUENCE:0',
    'DTSTART:20261116T194500Z',
    'DTEND:20261116T214500Z',
    'SUMMARY:Greece vs Serbia',
    'LOCATION:Panthessaliko Stadium\\, Volos',
    'DESCRIPTION:UEFA Nations League\\nKickoff 21:45 in Volos\\nTV: Alpha\\, Novasports (Greek TV)\\nTickets: pame-ethniki.gr\\n\\nKept up to date by scarf · scarf.fan/greece/football',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-PT1H',
    'DESCRIPTION:Greece vs Serbia kicks off in an hour · Alpha\\, Novasports',
    'END:VALARM',
    'URL;VALUE=URI:https://www.pame-ethniki.gr/gnfc/showProductList.html',
    'END:VEVENT',
  ])
})

test('a game without a time is an all-day placeholder that names the federation', () => {
  assert.deepEqual(vevent(toIcs(basketball, [ukraine], now), 'fiba-127100@scarf'), [
    'BEGIN:VEVENT',
    'UID:fiba-127100@scarf',
    'SEQUENCE:0',
    'DTSTART;VALUE=DATE:20270226',
    'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
    'X-MICROSOFT-MSNCALENDAR-ALLDAYEVENT:TRUE',
    'SUMMARY:Greece vs Ukraine · time not announced',
    "DESCRIPTION:FIBA Basketball World Cup 2027 European Qualifiers\\nVenue not announced\\nWe'll fill in the time and arena as soon as FIBA publishes them.\\n\\nKept up to date by scarf · scarf.fan/greece/basketball",
    'URL;VALUE=URI:https://scarf.fan/greece/basketball/',
    'END:VEVENT',
  ])
})

test('unknown lines drop out, and the footer and team page follow the site URL', () => {
  const bare: Game = { ...serbia, utcOffsetHours: undefined, tv: undefined, tickets: undefined }
  const lines = vevent(toIcs(football, [bare], now, 'https://example.github.io/scarf'), 'uefa-2047926@scarf')
  assert.ok(lines.includes('DESCRIPTION:UEFA Nations League\\n\\nKept up to date by scarf · example.github.io/scarf/greece/football'))
  assert.ok(lines.includes('DESCRIPTION:Greece vs Serbia kicks off in an hour'))
  assert.ok(lines.includes('URL;VALUE=URI:https://example.github.io/scarf/greece/football/'))
})

test('feed copy passes the voice checks', () => {
  const ics = toIcs(football, [timed, unscheduled, serbia, ukraine], now).replaceAll(/\r\n[ \t]/g, '')
  assert.doesNotMatch(ics, /!/)
  assert.doesNotMatch(ics, /\p{Extended_Pictographic}/u)
  assert.doesNotMatch(ics, /notification|don't miss|\bTBA\b|\bTBC\b/i)
  const kickoffs = [...ics.matchAll(/Kickoff \d{2}:\d{2}(.{0,5})/g)]
  assert.equal(kickoffs.length, 2)
  for (const [, after] of kickoffs) assert.match(after, /^ in \S/)
})

test('nothing a fan reads carries the working title or a TBA', () => {
  const ics = toIcs(football, [timed, unscheduled], now)
  assert.doesNotMatch(ics, /event-schedule|Event schedule|\bTBA\b|\bTBC\b/)
  assert.doesNotMatch(ics, /!/)
})

test('every team gets a feed in its own name, colour and side', () => {
  for (const team of teams) {
    const lines = icsLines(toIcs(team, [], now))
    assert.ok(lines.includes(`X-WR-CALNAME:${team.name} · scarf`), team.name)
    assert.ok(lines.includes(`X-APPLE-CALENDAR-COLOR:${team.colours[0]}`), team.name)
    assert.ok(lines.some((l) => l.startsWith(`X-WR-CALDESC:Every game of the ${team.side} — `)), team.name)
  }
})
