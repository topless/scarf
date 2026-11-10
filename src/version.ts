import { createHash } from 'node:crypto'

// A feed's version: 12 hex of SHA-256 over the feed without its DTSTAMP lines. Every build restamps
// DTSTAMP, so only a changed game changes the version (docs/observability.md, Feed subscribers).
export const feedVersion = (ics: string): string =>
  createHash('sha256').update(ics.replace(/^DTSTAMP[^\r\n]*\r?\n/gm, '')).digest('hex').slice(0, 12)
