import ical, { ICalAlarmRelatesTo, ICalAlarmType, type ICalCalendar, type ICalEventData } from 'ical-generator'
import { feedName, siteName, type Team } from './config.ts'
import type { Game } from './game.ts'
import { capitalise, reminder, REMINDER_HOURS, WORDS } from './page.ts'

const GAME_HOURS = 2
const SALE_REMINDER_HOUR = 9 // 09:00 at the venue on the day tickets go on sale
const DEFAULT_SITE_URL = 'https://scarf.fan'
const FEDERATION = { uefa: 'UEFA', fiba: 'FIBA' } as const
// "Mon 16 Nov", read in UTC so a venue-local YYYY-MM-DD stays on its own day.
const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const DAY_MONTH_YEAR = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })

// Game id → the day (YYYY-MM-DD) the build first saw it, for games announced after scarf started
// watching the team (src/known-games.ts).
export type Announced = Record<string, string>

// Event copy follows docs/calendar-event-spec.md, with "vs" between the teams and each sport's own
// words, the same as on its page (WORDS in page.ts).
// With `alerts` this is the -alerts variant: the same events under their own calendar name, plus
// one all-day "New game" entry per announced game (spec § 4). The default feed never carries those.
export function toIcs(team: Team, games: Game[], now: Date, siteUrl = DEFAULT_SITE_URL, alerts?: Announced): string {
  const words = WORDS[team.sport]
  const teamPage = `${siteUrl}/${team.country}/${team.sport}`
  const footer = `Kept up to date by ${siteName} · ${teamPage.replace(/^https?:\/\//, '')}`
  // Header fields: team first, brand last, the team's colour.
  const calendar = ical({
    prodId: { company: siteName, product: 'feeds', language: 'EN' },
    name: feedName(team, alerts !== undefined),
    description: alerts
      ? `Every game of the ${team.side} — ${words.start}, venue, TV, tickets — and a note on the day a new game is announced. Kept up to date by ${siteName}.`
      : `Every game of the ${team.side} — ${words.start}, venue, TV, tickets. Kept up to date by ${siteName}.`,
    color: team.colours[0],
    ttl: 12 * 60 * 60,
  })
  for (const game of games) {
    const title = `${game.home} vs ${game.away}`
    const city = game.city?.trim()
    const details = {
      // The source id keeps the UID stable, so a changed game replaces the old entry in place.
      // The sources name no country for the venue, so LOCATION stops at the city.
      id: `${game.id}@${siteName}`,
      stamp: now,
      location: [game.venue, city].filter(Boolean).join(', ') || undefined,
      url: game.tickets ?? `${teamPage}/`,
    }
    if (game.kickoff) {
      const start = new Date(game.kickoff)
      const end = new Date(start.getTime() + GAME_HOURS * 60 * 60 * 1000)
      const description = [
        game.competition,
        kickoffLine(game, city, words.start),
        game.tv ? `TV: ${game.tv}` : undefined,
        game.tickets ? `Tickets: ${ticketHost(game.tickets)}` : undefined,
        '',
        footer,
      ]
      const event = calendar.createEvent({ ...details, summary: title, start, end, description: lines(description) })
      // A reminder on the device; Apple honours it, Google is believed to ignore it (see README).
      // Its words are shared with the page (reminder in page.ts).
      const alarm = reminder(game, team.sport)
      event.createAlarm({
        type: ICalAlarmType.display,
        trigger: REMINDER_HOURS * 60 * 60,
        description: [alarm.text, alarm.tv].filter(Boolean).join(' · '),
      })
    } else {
      // All-day placeholder until the time is announced; the same UID later becomes a timed event.
      const federation = FEDERATION[team.source.kind]
      const description = game.venue
        ? [game.competition, `We'll fill in the time as soon as ${federation} publishes it.`, '', footer]
        : [game.competition, 'Venue not announced', `We'll fill in the time and ${words.ground} as soon as ${federation} publishes them.`, '', footer]
      calendar.createEvent({
        ...details,
        summary: `${title} · time not announced`,
        start: new Date(game.date),
        allDay: true,
        description: lines(description),
      })
    }
    // The "Tickets on sale" day rides on its game, so it leaves the feed with the game: build.ts
    // drops past games before they reach here, and a sale day with no game has nothing to sell.
    if (game.onSale && game.tickets) ticketSaleEvent(calendar, game, now, footer)
  }
  // Only games still in the feed are announced, so an alert leaves with its game.
  for (const game of games) {
    const firstSeen = alerts?.[game.id]
    if (firstSeen) calendar.createEvent(newGameEvent(team, game, firstSeen, now, teamPage, footer))
  }
  return calendar.toString()
}

// An all-day entry on the day the build first saw the game. It says what is still to come; the
// game itself sits in the same calendar under its own UID.
function newGameEvent(team: Team, game: Game, firstSeen: string, now: Date, teamPage: string, footer: string): ICalEventData {
  const federation = FEDERATION[team.source.kind]
  const { ground } = WORDS[team.sport]
  const toFollow = game.kickoff ? undefined : game.venue ? 'time to follow' : `time and ${ground} to follow`
  return {
    id: `${game.id}-new@${siteName}`,
    stamp: now,
    start: new Date(firstSeen),
    allDay: true,
    summary: `New game · ${game.home} vs ${game.away}, ${DAY_MONTH_YEAR.format(new Date(game.date))}`,
    description: lines([`Just announced by ${federation}. It's already in this calendar${toFollow ? ` — ${toFollow}` : ''}.`, '', footer]),
    url: `${teamPage}/`,
  }
}

// "Kickoff 21:45 in Volos", "Tip-off 20:00 in Athens": venue-local time with the city, so the copy
// never pretends to be the reader's time; "at the venue" until the city is known, as on the page.
// Dropped while the venue's offset is unknown; the calendar still shows the start in the reader's
// own zone.
function kickoffLine(game: Game, city: string | undefined, start: string): string | undefined {
  const time = localTime(game, city)
  return time && `${capitalise(start)} ${time}`
}

// "21:45 in Volos", "21:45 at the venue" while the city is unknown, or undefined while the kickoff
// or the venue's offset is unknown.
function localTime(game: Game, city: string | undefined): string | undefined {
  if (!game.kickoff || game.utcOffsetHours === undefined) return undefined
  const local = new Date(new Date(game.kickoff).getTime() + game.utcOffsetHours * 60 * 60 * 1000)
  return `${local.toISOString().slice(11, 16)} ${city ? `in ${city}` : 'at the venue'}`
}

// Spec section 3: an all-day event on the day tickets go on sale, with a reminder at 09:00 at the
// venue. The UID hangs off the game's, so a changed day moves the event in place and a removed
// day removes it on the next build.
function ticketSaleEvent(calendar: ICalCalendar, game: Game, now: Date, footer: string): void {
  const title = `${game.home} vs ${game.away}`
  const host = ticketHost(game.tickets!)
  const event = calendar.createEvent({
    id: `${game.id}-tickets@${siteName}`,
    stamp: now,
    summary: `Tickets on sale · ${title}`,
    start: new Date(game.onSale!),
    allDay: true,
    url: game.tickets,
    description: lines([`Sales open today at ${host}`, gameLine(game), '', footer]),
  })
  const alarm = event.createAlarm({ type: ICalAlarmType.display, description: `Tickets for ${title} go on sale today · ${host}` })
  if (game.utcOffsetHours === undefined) {
    // No offset to place the venue's 09:00 on the clock, so nine hours into the all-day event,
    // which is 09:00 in the reader's own zone. Said explicitly: ical-generator otherwise counts
    // a positive offset from the end of the event, the next midnight.
    alarm.triggerAfter(SALE_REMINDER_HOUR * 60 * 60).relatesTo(ICalAlarmRelatesTo.start)
  } else {
    // 09:00 at the venue as an absolute instant from the game's offset. A sale day on the other
    // side of a clock change lands an hour off, which is close enough for a reminder.
    const midnight = Date.parse(`${game.onSale}T00:00:00Z`)
    alarm.trigger(new Date(midnight + (SALE_REMINDER_HOUR - game.utcOffsetHours) * 60 * 60 * 1000))
  }
}

// "The game: Mon 16 Nov, 21:45 in Volos, Panthessaliko Stadium". The time reads as on the kickoff
// line; "time not announced" while there is none; the venue only when known.
function gameLine(game: Game): string {
  const time = game.kickoff ? localTime(game, game.city?.trim()) : 'time not announced'
  return `The game: ${[DAY.format(new Date(game.date)), time, game.venue].filter(Boolean).join(', ')}`
}

// "pame-ethniki.gr": the ticket seller as a fan would say it.
const ticketHost = (url: string): string => new URL(url).hostname.replace(/^www\./, '')

// Unknown lines drop out; the blank line before the footer stays.
const lines = (parts: (string | undefined)[]): string =>
  parts.filter((part) => part !== undefined).join('\n')
