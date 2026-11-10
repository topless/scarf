import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { competitionPath, countrySharePath, feedPath, landingSharePath, sharePath, teamPath, teams } from '../src/config.ts'

// `npm run build:fixtures` with every fetch made to throw, in a folder of its own so the real dist/
// stays as it was. With a SITE_URL, as a staging build would have, so the
// live feeds would be read too; a fetch also fails the run, even where the build catches its error.
test('the fixture build writes every feed, page and share image without a single request', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'scarf-'))
  t.after(() => rm(dir, { recursive: true }))
  const noFetch = 'data:text/javascript,globalThis.fetch = () => { process.exitCode = 1; throw new Error("the fixture build made a request") }'
  const build = fileURLToPath(new URL('../src/build.ts', import.meta.url))
  const env = { ...process.env, SITE_URL: 'https://scarf.fan' }
  await promisify(execFile)(process.execPath, ['--import', noFetch, build, '--fixtures'], { cwd: dir, env })

  // A competition with clubs this season gets a page and nothing else: no feed, no share image.
  const competitions = [...new Set(teams.flatMap((team) => (team.club ? [competitionPath(team.club.competition)] : [])))]
  const files = [
    ...teams.flatMap((team) => [feedPath(team), `${teamPath(team)}/index.html`, sharePath(team)]),
    ...teams.flatMap((team) => [`${team.country}/index.html`, countrySharePath(team)]),
    ...competitions.map((competition) => `${competition}/index.html`),
    'index.html',
    landingSharePath,
    'how-it-works/index.html',
    'kit/index.html',
    'privacy/index.html',
    'versions.json',
  ]
  for (const file of files) assert.ok(existsSync(join(dir, 'dist', file)), file)
  const versions = JSON.parse(await readFile(join(dir, 'dist', 'versions.json'), 'utf8'))
  // One feed per team and no other: the -alerts variant is gone.
  assert.deepEqual(Object.keys(versions).sort(), teams.map(feedPath).sort())
  assert.deepEqual((await readdir(join(dir, 'dist'), { recursive: true })).filter((file) => file.includes('alerts')), [])
  for (const version of Object.values(versions)) assert.match(version as string, /^[0-9a-f]{12}$/)
  assert.ok(competitions.includes('basketball/euroleague'))
  for (const competition of competitions) assert.ok(!existsSync(join(dir, 'dist', competition, 'share.png')), competition)
  assert.ok(!existsSync(join(dir, 'source-answers')))
  // Dated on the fixtures' own day, so their games are still upcoming: Greece v Serbia, 16 Nov 2026.
  assert.match(await readFile(join(dir, 'dist', 'greece/football.ics'), 'utf8'), /^UID:uefa-2047912@scarf\r$/m)
})

// The staging build: the answers a daily build saved stand in whatever their age, a source without one
// gets its fixture, nothing is fetched, and nothing is saved back.
test('the staging build reuses old saved answers, falls back to the fixture, and makes no request', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'scarf-'))
  t.after(() => rm(dir, { recursive: true }))
  const day = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
  const match = {
    id: '7',
    status: 'UPCOMING',
    homeTeam: { id: '49', internationalName: 'Greece' },
    awayTeam: { id: '999', internationalName: 'Opponent' },
    competition: { metaData: { name: 'International Friendly' } },
    kickOffTime: { date: day, dateTime: `${day}T18:45:00Z`, utcOffsetInHours: 3 },
  }
  await mkdir(join(dir, 'source-answers'))
  await writeFile(join(dir, 'source-answers/uefa.json'), JSON.stringify([match]))
  // Months old and covering one team: a push build would ask UEFA again; staging takes it as it is.
  const index = JSON.stringify({ 'uefa.json': { fetched: '2026-01-01T00:00:00Z', teamIds: [49] } })
  await writeFile(join(dir, 'source-answers/index.json'), index)
  const noFetch = 'data:text/javascript,globalThis.fetch = () => { process.exitCode = 1; throw new Error("the staging build made a request") }'
  const build = fileURLToPath(new URL('../src/build.ts', import.meta.url))
  const env = { ...process.env, SITE_URL: 'https://staging.scarf.fan' }
  await promisify(execFile)(process.execPath, ['--import', noFetch, build, '--saved'], { cwd: dir, env })

  assert.match(await readFile(join(dir, 'dist/greece/football.ics'), 'utf8'), /^UID:uefa-7@scarf\r$/m)
  assert.ok(existsSync(join(dir, 'dist/greece/basketball.ics'))) // no FIBA answer was saved: the fixture stood in
  assert.equal(await readFile(join(dir, 'source-answers/index.json'), 'utf8'), index)
})

// The daily build with Greece's UEFA games played 31 and 2 days ago and one 10 days ahead, dated from
// today so the test never ages (#20).
test('a played game stays in the feed for 30 days as it was', async (t) => {
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
  const fiba = JSON.stringify(fileURLToPath(new URL('./fixtures/fiba-games.html', import.meta.url)))
  const euroleague = JSON.stringify(fileURLToPath(new URL('./fixtures/euroleague-games.json', import.meta.url)))
  const eurocup = JSON.stringify(fileURLToPath(new URL('./fixtures/eurocup-games.json', import.meta.url)))
  const stub = `import { readFileSync } from 'node:fs'
    globalThis.fetch = async (url) => {
      if (String(url).startsWith('https://scarf.fan/')) return new Response('', { status: 404 })
      console.error('asked ' + url)
      if (String(url).startsWith('https://match.uefa.com/')) return new Response(${JSON.stringify(uefa)})
      if (String(url).startsWith('https://www.fiba.basketball/')) return new Response(readFileSync(${fiba}, 'utf8'))
      if (String(url).includes('/v2/competitions/U/')) return new Response(readFileSync(${eurocup}, 'utf8'))
      if (String(url).startsWith('https://api-live.euroleague.net/')) return new Response(readFileSync(${euroleague}, 'utf8'))
      throw new Error('asked ' + url)
    }`
  const build = fileURLToPath(new URL('../src/build.ts', import.meta.url))
  const env = { ...process.env, SITE_URL: 'https://scarf.fan', GITHUB_EVENT_NAME: 'schedule', GITHUB_STEP_SUMMARY: join(dir, 'summary.md') }
  const { stderr } = await promisify(execFile)(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(stub)}`, build], { cwd: dir, env })
  const read = (file: string) => readFile(join(dir, file), 'utf8')

  // UEFA's one request starts 30 days back and still ends with the year after next.
  assert.match(stderr, new RegExp(`fromDate=${day(-30)}&toDate=${Number(day(0).slice(0, 4)) + 2}-12-31&`))
  const feed = await read('dist/greece/football.ics')
  assert.match(feed, /^UID:uefa-2@scarf\r$/m)
  assert.doesNotMatch(feed, /^UID:uefa-1@scarf\r$/m)
  // As it was before the game: no score in the title.
  assert.match(feed, /^SUMMARY:Greece vs Opponent 2\r$/m)
  // The team page lists only games still to come.
  const page = await read('dist/greece/football/index.html')
  assert.match(page, /Opponent 3/)
  assert.doesNotMatch(page, /Opponent 2/)
  // The run summary counts UEFA's matches, to watch for a quiet cap below 500 (src/uefa.ts).
  assert.match(await read('summary.md'), /UEFA answered one request for \d+ football teams with 3 matches/)
})

test('a team whose upcoming games all vanish from the source fails the build', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'scarf-'))
  t.after(() => rm(dir, { recursive: true }))
  const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10).replaceAll('-', '')
  const event = (id: number) =>
    `BEGIN:VEVENT\r\nUID:uefa-${id}@scarf\r\nSUMMARY:Greece vs Opponent ${id}\r\nDTSTART;VALUE=DATE:${day(id + 5)}\r\nEND:VEVENT\r\n`
  const live = `BEGIN:VCALENDAR\r\n${event(1)}${event(2)}END:VCALENDAR\r\n`
  const other = { id: '1', status: 'UPCOMING', homeTeam: { id: '122', internationalName: 'Albania' }, awayTeam: { id: '999', internationalName: 'Opponent' }, competition: { metaData: { name: 'International Friendly' } }, kickOffTime: { date: '2099-01-01', dateTime: '2099-01-01T18:45:00Z', utcOffsetInHours: 1 } }
  const fixture = (name: string) => JSON.stringify(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)))
  const stub = `import { readFileSync } from 'node:fs'
    globalThis.fetch = async (url) => {
      if (String(url) === 'https://scarf.fan/greece/football.ics') return new Response(${JSON.stringify(live)})
      if (String(url).startsWith('https://scarf.fan/')) return new Response('', { status: 404 })
      if (String(url).startsWith('https://match.uefa.com/')) return new Response(${JSON.stringify(JSON.stringify([other]))})
      if (String(url).startsWith('https://www.fiba.basketball/')) return new Response(readFileSync(${fixture('fiba-games.html')}, 'utf8'))
      if (String(url).includes('/v2/competitions/U/')) return new Response(readFileSync(${fixture('eurocup-games.json')}, 'utf8'))
      if (String(url).startsWith('https://api-live.euroleague.net/')) return new Response(readFileSync(${fixture('euroleague-games.json')}, 'utf8'))
      throw new Error('asked ' + url)
    }`
  const build = fileURLToPath(new URL('../src/build.ts', import.meta.url))
  const env = { ...process.env, SITE_URL: 'https://scarf.fan', GITHUB_EVENT_NAME: 'schedule' }
  await assert.rejects(promisify(execFile)(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(stub)}`, build], { cwd: dir, env }), /vanished/)
})
