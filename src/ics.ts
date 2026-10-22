import ical, { ICalAlarmType } from 'ical-generator'
import { siteName, type Team } from './config.ts'
import type { Game } from './game.ts'

const GAME_HOURS = 2
const REMINDER_HOURS = 1
const DEFAULT_SITE_URL = 'https://scarf.fan'
const FEDERATION = { uefa: 'UEFA', fiba: 'FIBA' } as const

// Event copy follows docs/calendar-event-spec.md, with "vs" between the teams.
export function toIcs(team: Team, games: Game[], now: Date, siteUrl = DEFAULT_SITE_URL): string {
  const teamPage = `${siteUrl}/${team.country}/${team.sport}`
  const footer = `Kept up to date by ${siteName} · ${teamPage.replace(/^https?:\/\//, '')}`
  // Header fields: team first, brand last, the team's colour.
  const calendar = ical({
    prodId: { company: siteName, product: 'feeds', language: 'EN' },
    name: `${team.name} · ${siteName}`,
    description: `Every game of the ${team.side} — kickoff, venue, TV, tickets. Kept up to date by ${siteName}.`,
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
        kickoffLine(game, city),
        game.tv ? `TV: ${game.tv}` : undefined,
        game.tickets ? `Tickets: ${new URL(game.tickets).hostname.replace(/^www\./, '')}` : undefined,
        '',
        footer,
      ]
      const event = calendar.createEvent({ ...details, summary: title, start, end, description: lines(description) })
      // A reminder on the device; Apple honours it, Google is believed to ignore it (see README).
      // The channel names are enough here; the "(Greek TV)" hint stays in the description.
      const tv = game.tv?.replace(/\s*\(.*\)$/, '')
      event.createAlarm({
        type: ICalAlarmType.display,
        trigger: REMINDER_HOURS * 60 * 60,
        description: [`${title} kicks off in an hour`, tv].filter(Boolean).join(' · '),
      })
    } else {
      // All-day placeholder until the time is announced; the same UID later becomes a timed event.
      const federation = FEDERATION[team.source.kind]
      const description = game.venue
        ? [game.competition, `We'll fill in the time as soon as ${federation} publishes it.`, '', footer]
        : [game.competition, 'Venue not announced', `We'll fill in the time and arena as soon as ${federation} publishes them.`, '', footer]
      calendar.createEvent({
        ...details,
        summary: `${title} · time not announced`,
        start: new Date(game.date),
        allDay: true,
        description: lines(description),
      })
    }
  }
  return calendar.toString()
}

// Venue-local time with the city, so the copy never pretends to be the reader's time. Dropped
// when either is unknown; the calendar still shows the kickoff in the reader's own zone.
function kickoffLine(game: Game, city: string | undefined): string | undefined {
  if (!game.kickoff || game.utcOffsetHours === undefined || !city) return undefined
  const local = new Date(new Date(game.kickoff).getTime() + game.utcOffsetHours * 60 * 60 * 1000)
  const hhmm = local.toISOString().slice(11, 16)
  return `Kickoff ${hhmm} in ${city}`
}

// Unknown lines drop out; the blank line before the footer stays.
const lines = (parts: (string | undefined)[]): string =>
  parts.filter((part) => part !== undefined).join('\n')
