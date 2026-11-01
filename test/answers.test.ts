import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test, type TestContext } from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { reusable, reusedNote, type SavedAnswers } from '../src/answers.ts'
import { teams } from '../src/config.ts'

const HOUR = 3_600_000
const now = new Date('2026-10-30T12:00:00Z')
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * HOUR).toISOString()

test('a saved answer stands in for a request while it is less than a day old', () => {
  assert.equal(reusable({ fetched: hoursAgo(23.9) }, now), true)
  assert.equal(reusable({ fetched: hoursAgo(24) }, now), false)
})

test('with no saved answer, as on the first push or once the cache is lost, the build asks', () => {
  assert.equal(reusable(undefined, now), false)
})

test("UEFA's saved answer covers the football teams it was asked for, and a team added since means asking again", () => {
  const uefa = { fetched: hoursAgo(3), teamIds: [49, 122] }
  assert.equal(reusable(uefa, now, [49, 122]), true)
  assert.equal(reusable(uefa, now, [122]), true) // a team dropped since is still covered
  assert.equal(reusable(uefa, now, [49, 122, 35]), false)
})

test('a FIBA page covers its own competition, so a competition added since means asking for its page', () => {
  const saved: SavedAnswers = { 'fiba-basketball-world-cup-2027-european-qualifiers.html': { fetched: hoursAgo(3) } }
  assert.equal(reusable(saved['fiba-basketball-world-cup-2027-european-qualifiers.html'], now), true)
  assert.equal(reusable(saved['fiba-eurobasket-2029.html'], now), false)
})

test('the run summary says which answers were reused and how old the oldest is', () => {
  const asked = { fetched: now.toISOString() }
  assert.equal(reusedNote([asked], now), '')
  assert.equal(reusedNote([{ fetched: hoursAgo(3.2) }], now), ' (reused, 3.2 h old)')
  assert.equal(reusedNote([asked, { fetched: hoursAgo(3.2) }, { fetched: hoursAgo(20) }], now), ' (2 reused, 20.0 h old)')
})

// A build on a push to main, in a folder of its own, with source-answers/ as an earlier run left it
// 3 h ago: the test fixtures, UEFA's answer covering `savedTeamIds`. The stub prints every request to a
// source, answers UEFA's with the fixture and fails the run on any other; the live feeds, our own
// site, answer 404.
const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))
const build = fileURLToPath(new URL('../src/build.ts', import.meta.url))
const uefaTeamIds = teams.flatMap(({ source }) => (source.kind === 'uefa' ? [source.teamId] : []))
const fibaEvents = [...new Set(teams.flatMap(({ source }) => (source.kind === 'fiba' ? [source.event] : [])))]

async function pushBuild(t: TestContext, savedTeamIds: number[]) {
  const dir = await mkdtemp(join(tmpdir(), 'scarf-'))
  t.after(() => rm(dir, { recursive: true }))
  const answers = join(dir, 'source-answers')
  await mkdir(answers)
  const fetched = new Date(Date.now() - 3 * HOUR).toISOString()
  const index: SavedAnswers = { 'uefa.json': { fetched, teamIds: savedTeamIds } }
  await copyFile(fixture('uefa-matches.json'), join(answers, 'uefa.json'))
  for (const event of fibaEvents) {
    await copyFile(fixture('fiba-games.html'), join(answers, `${event}.html`))
    index[`${event}.html`] = { fetched }
  }
  await writeFile(join(answers, 'index.json'), JSON.stringify(index))
  const stub = `import { readFileSync } from 'node:fs'
    globalThis.fetch = async (url) => {
      if (String(url).startsWith('https://scarf.fan/')) return new Response('', { status: 404 })
      console.error('asked ' + url)
      if (String(url).startsWith('https://match.uefa.com/')) return new Response(readFileSync(${JSON.stringify(fixture('uefa-matches.json'))}, 'utf8'))
      process.exitCode = 1
      throw new Error('asked ' + url)
    }`
  const summary = join(dir, 'summary.md')
  const env = { ...process.env, SITE_URL: 'https://scarf.fan', GITHUB_EVENT_NAME: 'push', GITHUB_STEP_SUMMARY: summary }
  const { stderr } = await promisify(execFile)(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(stub)}`, build], { cwd: dir, env })
  return {
    index,
    asked: stderr.split('\n').filter((line) => line.startsWith('asked ')),
    summary: await readFile(summary, 'utf8'),
    saved: JSON.parse(await readFile(join(answers, 'index.json'), 'utf8')) as SavedAnswers,
    savedUefa: JSON.parse(await readFile(join(answers, 'uefa.json'), 'utf8')),
  }
}

// Each runs a whole build, about 2 s, so the two run side by side.
describe('a push build', { concurrency: true }, () => {
  test('a push within a day of the last run asks no source, and its summary says the answers were reused', async (t) => {
    const { index, asked, summary, saved } = await pushBuild(t, uefaTeamIds)
    assert.deepEqual(asked, [])
    assert.match(summary, /UEFA answered one request for \d+ football teams with \d+ matches \(reused, 3\.0 h old\) · FIBA answered \d+ competition pages? \(reused, 3\.0 h old\)\./)
    // Saved again as they were, so they still age out a day after they were fetched.
    assert.deepEqual(saved, index)
  })

  test('a push that adds a football team asks UEFA once, for every team, and reuses the FIBA pages', async (t) => {
    const { index, asked, summary, saved, savedUefa } = await pushBuild(t, uefaTeamIds.slice(1))
    assert.equal(asked.length, 1)
    assert.match(asked[0], new RegExp(`^asked https://match\\.uefa\\.com/v5/matches\\?teamId=${uefaTeamIds.join(',')}&`))
    assert.match(summary, /UEFA answered one request for \d+ football teams with \d+ matches · FIBA answered \d+ competition pages? \(reused, 3\.0 h old\)\./)
    // Saved with UEFA's new answer, which covers every team, so the next push reuses it too.
    assert.deepEqual(saved, { ...index, 'uefa.json': { fetched: saved['uefa.json'].fetched, teamIds: uefaTeamIds } })
    assert.ok(saved['uefa.json'].fetched > index['uefa.json'].fetched)
    assert.deepEqual(savedUefa, JSON.parse(await readFile(fixture('uefa-matches.json'), 'utf8')))
  })
})
