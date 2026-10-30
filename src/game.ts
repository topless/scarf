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

export function byStart(a: Game, b: Game): number {
  return (a.kickoff ?? a.date).localeCompare(b.kickoff ?? b.date)
}

export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'scarf/0.1 (personal fixture calendar)' },
    signal: AbortSignal.timeout(30_000), // fail in 30 s, not after GitHub's six-hour job limit
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.text()
}
