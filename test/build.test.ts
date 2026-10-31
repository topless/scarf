import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { alertsFeedPath, countrySharePath, feedPath, landingSharePath, sharePath, teams } from '../src/config.ts'

// `npm run build:fixtures` with every fetch made to throw, in a folder of its own so the real dist/
// and known-games.json stay as they were. With a SITE_URL, as a staging build would have, so the
// live feeds would be read too; a fetch also fails the run, even where the build catches its error.
test('the fixture build writes every feed, page and share image without a single request', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'scarf-'))
  t.after(() => rm(dir, { recursive: true }))
  const noFetch = 'data:text/javascript,globalThis.fetch = () => { process.exitCode = 1; throw new Error("the fixture build made a request") }'
  const build = fileURLToPath(new URL('../src/build.ts', import.meta.url))
  const env = { ...process.env, SITE_URL: 'https://scarf.fan' }
  await promisify(execFile)(process.execPath, ['--import', noFetch, build, '--fixtures'], { cwd: dir, env })

  const files = [
    ...teams.flatMap((team) => [feedPath(team), alertsFeedPath(team), `${team.country}/${team.sport}/index.html`, sharePath(team)]),
    ...teams.flatMap((team) => [`${team.country}/index.html`, countrySharePath(team)]),
    'index.html',
    landingSharePath,
    'how-it-works/index.html',
    'kit/index.html',
  ]
  for (const file of files) assert.ok(existsSync(join(dir, 'dist', file)), file)
  assert.ok(!existsSync(join(dir, 'known-games.json')))
  assert.ok(!existsSync(join(dir, 'source-answers')))
  // Dated on the fixtures' own day, so their games are still upcoming: Greece v Serbia, 16 Nov 2026.
  assert.match(await readFile(join(dir, 'dist', 'greece/football.ics'), 'utf8'), /^UID:uefa-2047912@scarf\r$/m)
})

// The daily build with Greece's UEFA games played 31 and 2 days ago and one 10 days ahead, dated from
// today so the test never ages, and a record of known games older than all three (#20).
test('a played game stays in the feed for 30 days as it was, and is never announced as new', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'scarf-'))
  t.after(() => rm(dir, { recursive: true }))
  const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)
  const greece = (id: string, offset: number) => ({
    id,
    status: offset < 0 ? 'FINISHED' : 'UPCOMING',
    homeTeam: { id: '49', internationalName: 'Greece' },
    awayTeam: { id: '999', internationalName: `Opponent ${id}` },
    competition: { metaData: { name: 'International Friendly' } },
    kickOffTime: { date: day(offset), dateTime: `${day(offset)}T18:45:00Z`, utcOffsetInHours: 3 },
  })
  const uefa = JSON.stringify([greece('1', -31), greece('2', -2), greece('3', 10)])
  await writeFile(join(dir, 'known-games.json'), JSON.stringify({ 'greece/football': { seeded: '2026-01-01', games: {} } }))
  const fiba = JSON.stringify(fileURLToPath(new URL('./fixtures/fiba-games.html', import.meta.url)))
  const stub = `import { readFileSync } from 'node:fs'
    globalThis.fetch = async (url) => {
      if (String(url).startsWith('https://scarf.fan/')) return new Response('', { status: 404 })
      console.error('asked ' + url)
      if (String(url).startsWith('https://match.uefa.com/')) return new Response(${JSON.stringify(uefa)})
      if (String(url).startsWith('https://www.fiba.basketball/')) return new Response(readFileSync(${fiba}, 'utf8'))
      throw new Error('asked ' + url)
    }`
  const build = fileURLToPath(new URL('../src/build.ts', import.meta.url))
  const env = { ...process.env, SITE_URL: 'https://scarf.fan', GITHUB_EVENT_NAME: 'schedule', GITHUB_STEP_SUMMARY: join(dir, 'summary.md') }
  const { stderr } = await promisify(execFile)(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(stub)}`, build], { cwd: dir, env })
  const read = (file: string) => readFile(join(dir, file), 'utf8')

  // UEFA's one request starts 30 days back and still ends with the year after next.
  assert.match(stderr, new RegExp(`fromDate=${day(-30)}&toDate=${Number(day(0).slice(0, 4)) + 2}-12-31&`))
  const feed = await read('dist/greece/football.ics')
  const alerts = await read('dist/greece/football-alerts.ics')
  for (const ics of [feed, alerts]) {
    assert.match(ics, /^UID:uefa-2@scarf\r$/m)
    assert.doesNotMatch(ics, /^UID:uefa-1@scarf\r$/m)
  }
  // As it was before the game: no score in the title.
  assert.match(feed, /^SUMMARY:Greece vs Opponent 2\r$/m)
  // The game still to come is announced, the played one never.
  assert.match(alerts, /^UID:uefa-3-new@scarf\r$/m)
  assert.doesNotMatch(alerts, /^UID:uefa-2-new@scarf\r$/m)
  // The team page lists only games still to come.
  const page = await read('dist/greece/football/index.html')
  assert.match(page, /Opponent 3/)
  assert.doesNotMatch(page, /Opponent 2/)
  // The run summary counts UEFA's matches, to watch for a quiet cap below 500 (src/uefa.ts).
  assert.match(await read('summary.md'), /UEFA answered one request for \d+ football teams with 3 matches/)
})
