// What a build changes in a feed compared with the one fans have now, for the run summary
// (docs/observability.md, "Build and data changes"). Events are matched by UID. DTSTAMP is left
// out because every build restamps it, and so is the reminder, which repeats the summary and TV.

type CalendarEvent = Map<string, string>

const FIELDS: Record<string, string> = { SUMMARY: 'title', DTSTART: 'start', LOCATION: 'venue', DESCRIPTION: '', URL: 'link' }

// Every VEVENT's own properties by UID, unfolded and unescaped.
export function calendarEvents(ics: string): Map<string, CalendarEvent> {
  const found = new Map<string, CalendarEvent>()
  let event: CalendarEvent | undefined
  let inAlarm = false
  for (const line of ics.replaceAll(/\r?\n[ \t]/g, '').split(/\r?\n/)) {
    if (line === 'BEGIN:VEVENT') event = new Map()
    else if (line === 'END:VEVENT') {
      if (event?.has('UID')) found.set(event.get('UID')!, event)
      event = undefined
    } else if (line === 'BEGIN:VALARM') inAlarm = true
    else if (line === 'END:VALARM') inAlarm = false
    else if (event && !inAlarm) {
      const name = line.match(/^[^:;]+/)?.[0]
      const colon = line.indexOf(':')
      if (name && colon > 0) event.set(name, unescape(line.slice(colon + 1)))
    }
  }
  return found
}

// One line per added, changed or removed event; played games leave the feed PLAYED_DAYS after they
// are played (game.ts), so they are counted, not listed. `today` is YYYY-MM-DD in UTC, as the build uses it.
export function feedChanges(before: string, after: string, today: string): string[] {
  const was = calendarEvents(before)
  const now = calendarEvents(after)
  const lines: string[] = []
  for (const [uid, event] of now) {
    const old = was.get(uid)
    if (!old) {
      lines.push(`Added: ${label(event)}`)
      continue
    }
    const diffs = Object.keys(FIELDS).flatMap((field) => difference(field, old.get(field) ?? '', event.get(field) ?? ''))
    if (diffs.length) lines.push(`Changed: ${event.get('SUMMARY')}: ${diffs.join('; ')}`)
  }
  let played = 0
  for (const [uid, event] of was) {
    if (now.has(uid)) continue
    if (day(event.get('DTSTART') ?? '') < today) played++
    else lines.push(`Removed: ${label(event)}`)
  }
  if (played) lines.push(`${played} played ${played === 1 ? 'game' : 'games'} left the feed`)
  return lines
}

function difference(field: string, before: string, after: string): string[] {
  if (before === after) return []
  if (field === 'DESCRIPTION') {
    // Line by line, so a kickoff change reads "Kickoff 20:45 in Athens → Kickoff 21:45 in Athens".
    const old = before.split('\n')
    const now = after.split('\n')
    const gone = old.filter((line) => !now.includes(line)).join(' / ')
    const came = now.filter((line) => !old.includes(line)).join(' / ')
    return [`${gone || 'nothing'} → ${came || 'nothing'}`]
  }
  if (field === 'DTSTART') return [`start ${when(before)} → ${when(after)}`]
  return [`${FIELDS[field]} ${before || 'none'} → ${after || 'none'}`]
}

const label = (event: CalendarEvent) => `${event.get('SUMMARY')} on ${day(event.get('DTSTART') ?? '')}`

// "20261113T194500Z" → "2026-11-13"; a date-only start ("20261126") reads the same.
const day = (start: string) => `${start.slice(0, 4)}-${start.slice(4, 6)}-${start.slice(6, 8)}`

const when = (start: string) =>
  start.length > 8 ? `${day(start)} ${start.slice(9, 11)}:${start.slice(11, 13)} UTC` : `${day(start)}, time not announced`

const unescape = (value: string) => value.replaceAll(/\\([\\;,nN])/g, (_, c: string) => (c.toLowerCase() === 'n' ? '\n' : c))
