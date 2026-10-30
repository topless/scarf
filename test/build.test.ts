import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test, type TestContext } from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { alertsFeedPath, countrySharePath, feedPath, landingSharePath, sharePath, teams } from '../src/config.ts'

const build = fileURLToPath(new URL('../src/build.ts', import.meta.url))
const fixtures = fileURLToPath(new URL('./fixtures/', import.meta.url))

// A folder of its own for each build, so the real dist/, known-games.json and answers/ stay as they were.
async function folder(t: TestContext): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'scarf-'))
  t.after(() => rm(dir, { recursive: true }))
  return dir
}

// `npm run build:fixtures` with every fetch made to throw. With a SITE_URL, as a staging build would
// have, so the live feeds would be read too; a fetch also fails the run, even where the build catches
// its error.
test('the fixture build writes every feed, page and share image without a single request', async (t) => {
  const dir = await folder(t)
  const noFetch = 'data:text/javascript,globalThis.fetch = () => { process.exitCode = 1; throw new Error("the fixture build made a request") }'
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
  assert.ok(!existsSync(join(dir, 'answers')))
  // Dated on the fixtures' own day, so their games are still upcoming: Greece v Serbia, 16 Nov 2026.
  assert.match(await readFile(join(dir, 'dist', 'greece/football.ics'), 'utf8'), /^UID:uefa-2047912@scarf\r$/m)
})

// A build as the Actions job runs it, started by a push or by the schedule, except that UEFA and FIBA
// answer with the test fixtures and scarf.fan has no live feed. It returns the requests made to the
// two sources and what the build printed: with GITHUB_STEP_SUMMARY empty, the run summary too.
const sourcesStub = `
  import { readFileSync } from 'node:fs'
  globalThis.fetch = async (url) => {
    url = String(url)
    if (url.startsWith('https://scarf.fan/')) return new Response('', { status: 404 })
    const fixture = url.startsWith('https://match.uefa.com/') ? 'uefa-matches.json' : url.startsWith('https://www.fiba.basketball/') ? 'fiba-games.html' : undefined
    if (!fixture) {
      process.exitCode = 1
      throw new Error('unexpected request to ' + url)
    }
    console.error('request ' + url)
    return new Response(readFileSync(${JSON.stringify(fixtures)} + fixture))
  }`
async function sourceBuild(dir: string, event: 'push' | 'schedule'): Promise<{ requests: string[]; printed: string }> {
  const env = { ...process.env, SITE_URL: 'https://scarf.fan', GITHUB_EVENT_NAME: event, GITHUB_STEP_SUMMARY: '' }
  const stub = `data:text/javascript,${encodeURIComponent(sourcesStub)}`
  const { stdout, stderr } = await promisify(execFile)(process.execPath, ['--import', stub, build], { cwd: dir, env })
  return { requests: stderr.match(/(?<=^request ).+/gm) ?? [], printed: stdout }
}

const uefaTeamIds = teams.flatMap(({ source }) => (source.kind === 'uefa' ? [source.teamId] : []))
const fibaEvents = [...new Set(teams.flatMap(({ source }) => (source.kind === 'fiba' ? [source.event] : [])))]
const host = (url: string) => new URL(url).host
const everySource = ['match.uefa.com', ...fibaEvents.map(() => 'www.fiba.basketball')]

// A folder with answers/ as an earlier build left it, from the fixtures: by default an hour old, UEFA's
// answer asked for every football team and a page saved for every competition.
async function savedAnswers(t: TestContext, { uefaHours = 1, fibaHours = 1, teamIds = uefaTeamIds, events = fibaEvents } = {}): Promise<string> {
  const dir = await folder(t)
  const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
  const log: Record<string, object> = { 'uefa-matches.json': { fetched: hoursAgo(uefaHours), teamIds } }
  await mkdir(join(dir, 'answers'))
  await copyFile(join(fixtures, 'uefa-matches.json'), join(dir, 'answers', 'uefa-matches.json'))
  for (const event of events) {
    log[`fiba-${event}.html`] = { fetched: hoursAgo(fibaHours) }
    await copyFile(join(fixtures, 'fiba-games.html'), join(dir, 'answers', `fiba-${event}.html`))
  }
  await writeFile(join(dir, 'answers', 'log.json'), JSON.stringify(log))
  return dir
}

// Side by side: each build takes about two seconds, mostly the share images.
describe('push builds reuse the saved answers', { concurrency: true }, () => {
  test('the daily build asks both sources even with answers an hour old, and a push build after it asks neither', async (t) => {
    const dir = await savedAnswers(t)
    const daily = await sourceBuild(dir, 'schedule')
    assert.deepEqual(daily.requests.map(host), everySource)
    assert.match(daily.printed, new RegExp(`UEFA answered one request for ${uefaTeamIds.length} football teams · FIBA answered`))

    // It reads what the daily build saved, through the same checks as a fetched answer.
    const push = await sourceBuild(dir, 'push')
    assert.deepEqual(push.requests, [])
    const reused = `UEFA's saved answer reused for ${uefaTeamIds.length} football teams · FIBA's saved answer reused for ${fibaEvents.length} competition page`
    assert.match(push.printed, new RegExp(reused))
  })

  test('a push build asks only for what the saved answers miss: a new football team or a new competition', async (t) => {
    const [newTeam, newCompetition] = await Promise.all([
      savedAnswers(t, { teamIds: uefaTeamIds.slice(1) }).then((dir) => sourceBuild(dir, 'push')),
      savedAnswers(t, { events: fibaEvents.slice(1) }).then((dir) => sourceBuild(dir, 'push')),
    ])
    // One UEFA call, which asks for every team again, the new one with them.
    assert.equal(newTeam.requests.length, 1)
    assert.equal(new URL(newTeam.requests[0]!).searchParams.get('teamId'), uefaTeamIds.join(','))
    assert.match(newTeam.printed, /UEFA answered one request for \d+ football teams · FIBA's saved answer reused/)
    assert.deepEqual(newCompetition.requests, [`https://www.fiba.basketball/en/events/${fibaEvents[0]}/games`])
  })

  test('a push build asks a source again when its saved answer is over a day old or dated ahead of the clock, and both when none is saved', async (t) => {
    const builds = await Promise.all([
      savedAnswers(t, { uefaHours: 25, fibaHours: -1 }).then((dir) => sourceBuild(dir, 'push')),
      folder(t).then((dir) => sourceBuild(dir, 'push')),
    ])
    for (const { requests } of builds) assert.deepEqual(requests.map(host), everySource)
  })

  test('a broken saved answer fails the build, as a broken fetched one does', async (t) => {
    const dir = await savedAnswers(t)
    await writeFile(join(dir, 'answers', 'uefa-matches.json'), '[]')
    await assert.rejects(sourceBuild(dir, 'push'), /UEFA returned no matches at all/)
  })
})
