import assert from 'node:assert/strict'
import { test } from 'node:test'
import { feedVersion } from '../src/version.ts'
import worker, { appFamily, visitorHash } from '../worker/index.ts'

test('a User-Agent maps to its calendar app family', () => {
  const cases: [string, string][] = [
    ['iOS/17.5 (21F79) dataaccessd/1.0', 'apple'],
    ['macOS/14.5 (23F79) CalendarAgent/1.0', 'apple'],
    ['Google-Calendar-Importer', 'google'],
    ['Mozilla/5.0 (compatible; Googlebot-Calendar)', 'google'],
    ['Microsoft Office/16.0 (Windows NT 10.0; Microsoft Outlook 16.0)', 'microsoft'],
    ['Mozilla/5.0 Gecko/20100101 Thunderbird/128.0', 'thunderbird'],
    ['ICSx5/2.5 (Android 14)', 'android'],
    ['DAVx5/4.4 (dav4jvm)', 'android'],
    ['Mozilla/5.0 (X11; Linux x86_64) Chrome/126.0 Safari/537.36', 'browser'],
    ['Mozilla/5.0 (compatible; AhrefsBot/7.0)', 'bot'],
    ['SomethingNew/1.0', 'unknown'],
    ['', 'unknown'],
  ]
  for (const [userAgent, family] of cases) assert.equal(appFamily(userAgent), family, userAgent)
})

test('the visitor hash is 16 hex, steady within a day, different across days, and empty without a key', async () => {
  const hash = await visitorHash('secret', '2026-11-08', '203.0.113.7', 'iOS/17 dataaccessd')
  assert.match(hash, /^[0-9a-f]{16}$/)
  assert.equal(await visitorHash('secret', '2026-11-08', '203.0.113.7', 'iOS/17 dataaccessd'), hash)
  assert.notEqual(await visitorHash('secret', '2026-11-09', '203.0.113.7', 'iOS/17 dataaccessd'), hash)
  assert.notEqual(await visitorHash('secret', '2026-11-08', '203.0.113.8', 'iOS/17 dataaccessd'), hash)
  assert.equal(await visitorHash(undefined, '2026-11-08', '203.0.113.7', 'iOS/17 dataaccessd'), '')
})

test('a feed version ignores DTSTAMP and follows the games', () => {
  const feed = (stamp: string, summary: string) => `BEGIN:VEVENT\r\nDTSTAMP:${stamp}\r\nSUMMARY:${summary}\r\nEND:VEVENT\r\n`
  const one = feedVersion(feed('20261030T000000Z', 'Greece vs Serbia'))
  assert.match(one, /^[0-9a-f]{12}$/)
  assert.equal(feedVersion(feed('20261031T000000Z', 'Greece vs Serbia')), one)
  assert.notEqual(feedVersion(feed('20261030T000000Z', 'Greece vs Georgia')), one)
})

test('the Worker returns the assets response untouched and writes one row, and a failing write changes nothing', async () => {
  const served = new Response('BEGIN:VCALENDAR', { status: 200 })
  const rows: unknown[] = []
  const pending: Promise<unknown>[] = []
  const assets = { fetch: async (request: Request | URL | string) => (String(request instanceof Request ? request.url : request).endsWith('versions.json') ? Response.json({ 'greece/football.ics': 'abc123abc123' }) : served) }
  const ctx = { waitUntil: (promise: Promise<unknown>) => void pending.push(promise) }
  const request = new Request('https://scarf.fan/greece/football.ics', { headers: { 'user-agent': 'iOS/17 dataaccessd', 'cf-connecting-ip': '203.0.113.7' } })
  const response = await worker.fetch(request, { ASSETS: assets, SCARF_EVENTS: { writeDataPoint: (row) => void rows.push(row) }, VISITOR_KEY: 'secret' }, ctx)
  await Promise.all(pending)
  assert.equal(response, served)
  assert.equal(rows.length, 1)
  const row = rows[0] as { blobs: string[]; doubles: number[] }
  assert.deepEqual([row.blobs[0], row.blobs[1], row.blobs[2], row.blobs[4], row.blobs[6], row.doubles[0]], ['feed', '/greece/football.ics', 'apple', 'abc123abc123', '', 200])
  assert.ok(!JSON.stringify(row).includes('203.0.113.7'))

  const failing = { writeDataPoint: () => { throw new Error('down') } }
  assert.equal(await worker.fetch(request, { ASSETS: assets, SCARF_EVENTS: failing }, ctx), served)
  assert.equal(await worker.fetch(request, { ASSETS: assets }, ctx), served)
  await Promise.all(pending)
})
