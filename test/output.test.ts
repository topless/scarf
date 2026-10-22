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
// The spec's sample game with a hand-kept on-sale day (spec section 3).
const onSale: Game = { ...serbia, onSale: '2026-11-02' }

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
  // Every sample once, the spec's game with its sale day and a no-time game with one.
  const games = [timed, unscheduled, onSale, ukraine, { ...ukraine, tickets: 'https://tickets.example/u', onSale: '2027-01-15' }]
  const ics = toIcs(football, games, now).replaceAll(/\r\n[ \t]/g, '')
  assert.doesNotMatch(ics, /!/)
  assert.doesNotMatch(ics, /\p{Extended_Pictographic}/u)
  assert.doesNotMatch(ics, /notification|don't miss|\bTBA\b|\bTBC\b/i)
  const kickoffs = [...ics.matchAll(/Kickoff \d{2}:\d{2}(.{0,5})/g)]
  assert.equal(kickoffs.length, 2)
  for (const [, after] of kickoffs) assert.match(after, /^ in \S/)
  // The sale event names the game's time with its city too, or says the time is not announced.
  const gameLines = [...ics.matchAll(/The game: (.*?)\\n/g)].map(([, line]) => line)
  assert.equal(gameLines.length, 2)
  for (const line of gameLines) assert.match(line, /\d{2}:\d{2} in \S|time not announced/)
})

test('nothing a fan reads carries the working title or a TBA', () => {
  const ics = toIcs(football, [timed, unscheduled], now)
  assert.doesNotMatch(ics, /event-schedule|Event schedule|\bTBA\b|\bTBC\b/)
  assert.doesNotMatch(ics, /!/)
})

test('an on-sale day comes from the manual details alone', () => {
  assert.equal(withDetails(unscheduled, { onSale: '2026-11-01' }, { onSale: '2026-11-02' }).onSale, '2026-11-02')
  assert.equal(withDetails(unscheduled, { onSale: '2026-11-01' }).onSale, undefined)
})

test('a game with an on-sale day and a ticket link gets exactly one extra event, as the spec writes it', () => {
  const ics = toIcs(football, [onSale], now)
  assert.equal(icsLines(ics).filter((l) => l === 'BEGIN:VEVENT').length, 2)
  assert.deepEqual(vevent(ics, 'uefa-2047926-tickets@scarf'), [
    'BEGIN:VEVENT',
    'UID:uefa-2047926-tickets@scarf',
    'SEQUENCE:0',
    'DTSTART;VALUE=DATE:20261102',
    'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
    'X-MICROSOFT-MSNCALENDAR-ALLDAYEVENT:TRUE',
    'SUMMARY:Tickets on sale · Greece vs Serbia',
    'DESCRIPTION:Sales open today at pame-ethniki.gr\\nThe game: Mon 16 Nov\\, 21:45 in Volos\\, Panthessaliko Stadium\\n\\nKept up to date by scarf · scarf.fan/greece/football',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    // 09:00 in Volos (UTC+2) as an absolute instant.
    'TRIGGER;VALUE=DATE-TIME:20261102T070000Z',
    'DESCRIPTION:Tickets for Greece vs Serbia go on sale today · pame-ethniki.gr',
    'END:VALARM',
    'URL;VALUE=URI:https://www.pame-ethniki.gr/gnfc/showProductList.html',
    'END:VEVENT',
  ])
})

test('the on-sale event of a game without a time says so, names the venue only when known, and reminds nine hours into the day', () => {
  const tickets = 'https://www.ticketmaster.gr/greece'
  const sale = (game: Game) => vevent(toIcs(basketball, [game], now), 'fiba-127100-tickets@scarf')
  const bare = sale({ ...ukraine, tickets, onSale: '2027-01-15' })
  assert.ok(bare.includes('DTSTART;VALUE=DATE:20270115'))
  assert.ok(
    bare.includes(
      'DESCRIPTION:Sales open today at ticketmaster.gr\\nThe game: Fri 26 Feb\\, time not announced\\n\\nKept up to date by scarf · scarf.fan/greece/basketball',
    ),
  )
  // No UTC offset to place 09:00 at the venue, so 09:00 in the reader's own zone.
  assert.ok(bare.includes('TRIGGER;RELATED=START:PT9H'))
  assert.ok(bare.includes('DESCRIPTION:Tickets for Greece vs Ukraine go on sale today · ticketmaster.gr'))
  const arena = sale({ ...ukraine, tickets, onSale: '2027-01-15', venue: 'OAKA' })
  assert.ok(arena.some((l) => l.endsWith('The game: Fri 26 Feb\\, time not announced\\, OAKA\\n\\nKept up to date by scarf · scarf.fan/greece/basketball')))
})

test('removing the on-sale day, or having no ticket link, removes the extra event in place', () => {
  const uids = (games: Game[]) => icsLines(toIcs(football, games, now)).filter((l) => l.startsWith('UID:'))
  assert.deepEqual(uids([onSale]), ['UID:uefa-2047926@scarf', 'UID:uefa-2047926-tickets@scarf'])
  assert.deepEqual(uids([serbia]), ['UID:uefa-2047926@scarf'])
  assert.deepEqual(uids([{ ...onSale, tickets: undefined }]), ['UID:uefa-2047926@scarf'])
})

test('every team gets a feed in its own name, colour and side', () => {
  for (const team of teams) {
    const lines = icsLines(toIcs(team, [], now))
    assert.ok(lines.includes(`X-WR-CALNAME:${team.name} · scarf`), team.name)
    assert.ok(lines.includes(`X-APPLE-CALENDAR-COLOR:${team.colours[0]}`), team.name)
    assert.ok(lines.some((l) => l.startsWith(`X-WR-CALDESC:Every game of the ${team.side} — `)), team.name)
  }
})
