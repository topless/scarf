import cssColours from 'color-name'
import ical, { escape, foldLines, ICalAlarmRelatesTo, ICalAlarmType, type ICalCalendar } from 'ical-generator'
import { defaultSiteUrl, feedName, feedPath, siteName, teamPath, type Team } from './config.ts'
import type { Game } from './game.ts'
import { capitalise, federation, reminder, REMINDER_HOURS, shortDate, venueTime, WORDS } from './page.ts'

const GAME_HOURS = 2
const SALE_REMINDER_HOUR = 9 // 09:00 at the venue on the day tickets go on sale

// RFC 7986 COLOR takes a CSS colour name, not hex: the one closest to the eye (OKLab distance).
export function cssColourName(hex: string): string {
  const target = oklab([1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)))
  const distance = (rgb: number[]) => oklab(rgb).reduce((sum, v, i) => sum + (v - target[i]) ** 2, 0)
  return Object.entries(cssColours).reduce((best, next) => (distance(next[1]) < distance(best[1]) ? next : best))[0]
}

// sRGB 0–255 → OKLab (Björn Ottosson's matrices).
function oklab(rgb: number[]): number[] {
  const [r, g, b] = rgb.map((c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  const [l, m, s] = [
    0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b,
    0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b,
    0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b,
  ].map(Math.cbrt)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

// Event copy follows docs/calendar-event-spec.md, with "vs" between the teams and each sport's own
// words, the same as on its page (WORDS in page.ts).
export function toIcs(team: Team, games: Game[], now: Date, siteUrl = defaultSiteUrl): string {
  const words = WORDS[team.sport]
  const teamPage = `${siteUrl}/${teamPath(team)}`
  const footer = `Kept up to date by ${siteName} · ${teamPage.replace(/^https?:\/\//, '')}`
  // Header fields: team first, brand last, the team's colour. ical-generator writes each value both the
  // RFC 7986 way and the older X- way that Apple, Google and Outlook read; it skips DESCRIPTION and
  // COLOR, so those two are added by hand. Every line stays: we want the feed to work in every app.
  const description = `Every game of the ${team.side}: ${words.start}, venue, TV, tickets. Kept up to date by ${siteName}.`
  const calendar = ical({
    prodId: { company: siteName, product: 'feeds', language: 'EN' },
    name: feedName(team),
    description,
    color: team.colours[0],
    ttl: 12 * 60 * 60,
    url: `${teamPage}/`,
    source: `${siteUrl}/${feedPath(team)}`,
  })
  for (const game of games) {
    const title = `${game.home} vs ${game.away}`
    const details = {
      // The source id keeps the UID stable, so a changed game replaces the old entry in place.
      // The sources name no country for the venue, so LOCATION stops at the city.
      id: `${game.id}@${siteName}`,
      stamp: now,
      location: [game.venue, game.city].filter(Boolean).join(', ') || undefined,
      url: game.tickets ?? `${teamPage}/`,
    }
    if (game.kickoff) {
      const start = new Date(game.kickoff)
      const end = new Date(start.getTime() + GAME_HOURS * 60 * 60 * 1000)
      const description = [
        game.competition,
        kickoffLine(game, words.start),
        game.tv ? `TV: ${game.tv}` : undefined,
        game.tickets ? `Tickets: ${ticketHost(game.tickets)}` : undefined,
        '',
        footer,
      ]
      const event = calendar.createEvent({ ...details, summary: title, start, end, description: lines(description) })
      // A reminder on the device; which apps honour it is in docs/development.md, Known limits.
      // Its words are shared with the page (reminder in page.ts).
      const alarm = reminder(game, team.sport)
      event.createAlarm({
        type: ICalAlarmType.display,
        trigger: REMINDER_HOURS * 60 * 60,
        description: [alarm.text, alarm.tv].filter(Boolean).join(' · '),
      })
    } else {
      // All-day placeholder until the time is announced; the same UID later becomes a timed event.
      const description = game.venue
        ? [game.competition, `We'll fill in the time as soon as ${federation(team)} publishes it.`, '', footer]
        : [game.competition, 'Venue not announced', `We'll fill in the time and ${words.ground} as soon as ${federation(team)} publishes them.`, '', footer]
      calendar.createEvent({
        ...details,
        summary: `${title} · time not announced`,
        start: new Date(game.date),
        allDay: true,
        description: lines(description),
      })
    }
    // The "Tickets on sale" day rides on its game, so it leaves the feed with the game: build.ts
    // drops a game PLAYED_DAYS after it is played (game.ts), and a sale day with no game has nothing to sell.
    if (game.onSale && game.tickets) ticketSaleEvent(calendar, game, now, footer)
  }
  // Calendar properties must come before the events (RFC 5545 §3.6), and ical-generator writes its
  // custom ones after them, so DESCRIPTION and COLOR go in by hand after the last header line it writes.
  const header = foldLines(`DESCRIPTION:${escape(description, false)}\r\nCOLOR:${cssColourName(team.colours[0])}`)
  const ics = calendar.toString().replace(/^(X-APPLE-CALENDAR-COLOR:.*\r\n)/m, `$1${header}\r\n`)
  // RFC 5545 §3.1 ends every line, the last included, with CRLF; ical-generator leaves the last one off.
  return `${ics}\r\n`
}

// "Kickoff 21:45 in Volos", "Tip-off 20:00 in Athens": venue-local time with the city, so the copy
// never pretends to be the reader's time; "at the venue" until the city is known, as on the page.
// Dropped while the venue's offset is unknown; the calendar still shows the start in the reader's
// own zone.
function kickoffLine(game: Game, start: string): string | undefined {
  const time = venueTime(game)
  return time && `${capitalise(start)} ${time}`
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
  const time = game.kickoff ? venueTime(game) : 'time not announced'
  return `The game: ${[shortDate(new Date(game.date)), time, game.venue].filter(Boolean).join(', ')}`
}

// "pame-ethniki.gr": the ticket seller as a fan would say it.
const ticketHost = (url: string): string => new URL(url).hostname.replace(/^www\./, '')

// Unknown lines drop out; the blank line before the footer stays.
const lines = (parts: (string | undefined)[]): string =>
  parts.filter((part) => part !== undefined).join('\n')
