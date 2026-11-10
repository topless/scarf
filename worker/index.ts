// The Worker in front of the static files (#71, docs/observability.md "Feed subscribers"): it serves
// every .ics request from the assets untouched, then writes one Analytics Engine row about it.
// Web APIs only, so Node can run the pure functions in test/worker.test.ts.
interface Env {
  ASSETS: { fetch(request: Request | URL | string): Promise<Response> }
  SCARF_EVENTS?: { writeDataPoint(point: { indexes?: string[]; blobs?: string[]; doubles?: number[] }): void }
  VISITOR_KEY?: string
}
interface Context {
  waitUntil(promise: Promise<unknown>): void
}

// The calendar app behind a User-Agent; 'unknown' keeps the raw string in the row.
export function appFamily(userAgent: string): string {
  if (/Google-Calendar-Importer|Googlebot-Calendar/i.test(userAgent)) return 'google'
  if (/Outlook/i.test(userAgent)) return 'microsoft'
  if (/Thunderbird/i.test(userAgent)) return 'thunderbird'
  if (/ICSx5|DAVx5/i.test(userAgent)) return 'android'
  if (/dataaccessd|CalendarAgent/i.test(userAgent)) return 'apple'
  if (/bot|crawler|spider|curl|wget/i.test(userAgent)) return 'bot'
  if (/^Mozilla\//.test(userAgent)) return 'browser'
  return 'unknown'
}

const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
const encode = (text: string) => new TextEncoder().encode(text)

// 16 hex characters of SHA-256 over a daily key (an HMAC of the date with the secret), the address and
// the User-Agent: one device is one hash for a day, and days can't be joined. No secret, no hash.
export async function visitorHash(secret: string | undefined, day: string, ip: string, userAgent: string): Promise<string> {
  if (!secret) return ''
  const key = await crypto.subtle.importKey('raw', encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const dailyKey = hex(await crypto.subtle.sign('HMAC', key, encode(day)))
  return hex(await crypto.subtle.digest('SHA-256', encode(`${dailyKey}|${ip}|${userAgent}`))).slice(0, 16)
}

// dist/versions.json, read once per instance; a failed read is tried again on the next request.
let versions: Promise<Record<string, string>> | undefined
const feedVersions = (env: Env, url: URL) =>
  (versions ??= env.ASSETS.fetch(new URL('/versions.json', url))
    .then((response) => response.json() as Promise<Record<string, string>>)
    .catch(() => ((versions = undefined), {} as Record<string, string>)))

async function record(request: Request, response: Response, env: Env): Promise<void> {
  if (!env.SCARF_EVENTS) return
  const url = new URL(request.url)
  const userAgent = request.headers.get('user-agent') ?? ''
  const family = appFamily(userAgent)
  const visitor = await visitorHash(env.VISITOR_KEY, new Date().toISOString().slice(0, 10), request.headers.get('cf-connecting-ip') ?? '', userAgent)
  const country = (request as { cf?: { country?: string } }).cf?.country ?? ''
  env.SCARF_EVENTS.writeDataPoint({
    indexes: [url.pathname],
    blobs: ['feed', url.pathname, family, country, (await feedVersions(env, url))[url.pathname.slice(1)] ?? '', visitor, family === 'unknown' ? userAgent : ''],
    doubles: [response.status],
  })
}

export default {
  async fetch(request: Request, env: Env, ctx: Context): Promise<Response> {
    const response = await env.ASSETS.fetch(request)
    ctx.waitUntil(record(request, response, env).catch(() => {}))
    return response
  },
}
