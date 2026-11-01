import { readFile } from 'node:fs/promises'

export interface Game {
  // Stable id from the source, e.g. "uefa-2047926". Used as the calendar event UID,
  // so a changed kickoff time replaces the event instead of duplicating it.
  id: string
  competition: string
  home: string
  away: string
  date: string // YYYY-MM-DD at the venue
  kickoff?: string // ISO instant in UTC; missing while the time is not announced
  utcOffsetHours?: number // the venue's offset from UTC at kickoff
  venue?: string
  city?: string
  tv?: string
  tickets?: string
  note?: string
  onSale?: string // YYYY-MM-DD at the venue: the day tickets go on sale, kept by hand in manual.ts
}

// What the sources don't provide, kept by hand in config.ts and manual.ts.
export type Details = Pick<Game, 'kickoff' | 'utcOffsetHours' | 'venue' | 'city' | 'tv' | 'tickets' | 'note' | 'onSale'>

// The source wins for time and place once it has them; hand-kept values only fill the gaps.
export function withDetails(game: Game, teamDefaults: Details, manual: Details = {}): Game {
  return {
    ...game,
    kickoff: game.kickoff ?? manual.kickoff,
    utcOffsetHours: game.utcOffsetHours ?? manual.utcOffsetHours,
    venue: game.venue ?? manual.venue,
    city: game.city ?? manual.city,
    tv: manual.tv ?? teamDefaults.tv,
    tickets: manual.tickets ?? teamDefaults.tickets,
    note: manual.note,
    onSale: manual.onSale ?? game.onSale,
  }
}

// A played game stays in the feed this many days, exactly as it was, so it doesn't vanish from
// fans' calendars the day after (#20). Longer only once UEFA's match count in the run summary
// shows room under the cap in uefa.ts: the one UEFA request asks from this far back.
export const PLAYED_DAYS = 30

// The first day (YYYY-MM-DD) a feed still carries: `today` less PLAYED_DAYS.
export const keptSince = (today: string): string => new Date(Date.parse(today) - PLAYED_DAYS * 86_400_000).toISOString().slice(0, 10)

export function byStart(a: Game, b: Game): number {
  return (a.kickoff ?? a.date).localeCompare(b.kickoff ?? b.date)
}

// A source's answer: read from `saved`, an answer saved earlier, which makes no request (a fixture
// build reads test/fixtures/), or else fetched from `url`.
export async function fetchText(url: string, saved?: URL): Promise<string> {
  if (saved) return readFile(saved, 'utf8')
  const res = await fetch(url, {
    headers: { 'User-Agent': 'scarf/0.1 (personal fixture calendar)' },
    signal: AbortSignal.timeout(30_000), // fail in 30 s, not after GitHub's six-hour job limit
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.text()
}
