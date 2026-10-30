import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { teams } from '../src/config.ts'

// The daily build in a folder of its own, every request to a source printed and answered from the
// fixtures, the live feeds (our own site) answering 404: however many teams there are, one UEFA
// request carries every football team and one FIBA page serves each competition.
test('a daily build asks UEFA once, for every football team, and FIBA once per competition', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'scarf-'))
  t.after(() => rm(dir, { recursive: true }))
  const fixture = (name: string) => JSON.stringify(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)))
  const stub = `import { readFileSync } from 'node:fs'
    globalThis.fetch = async (url) => {
      if (String(url).startsWith('https://scarf.fan/')) return new Response('', { status: 404 })
      console.error('asked ' + url)
      if (String(url).startsWith('https://match.uefa.com/')) return new Response(readFileSync(${fixture('uefa-matches.json')}, 'utf8'))
      if (String(url).startsWith('https://www.fiba.basketball/')) return new Response(readFileSync(${fixture('fiba-games.html')}, 'utf8'))
      process.exitCode = 1
      throw new Error('asked ' + url)
    }`
  const build = fileURLToPath(new URL('../src/build.ts', import.meta.url))
  // A scheduled run, which always asks the sources; no run page to write a summary to.
  const env = { ...process.env, SITE_URL: 'https://scarf.fan', GITHUB_EVENT_NAME: 'schedule', GITHUB_STEP_SUMMARY: '' }
  const { stderr } = await promisify(execFile)(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(stub)}`, build], { cwd: dir, env })

  const asked = stderr.split('\n').filter((line) => line.startsWith('asked '))
  const uefaIds = teams.flatMap(({ source }) => (source.kind === 'uefa' ? [source.teamId] : []))
  const events = [...new Set(teams.flatMap(({ source }) => (source.kind === 'fiba' ? [source.event] : [])))]
  assert.equal(asked.length, 1 + events.length, asked.join('\n'))
  assert.match(asked[0]!, new RegExp(`^asked https://match\\.uefa\\.com/v5/matches\\?teamId=${uefaIds.join(',')}&.*&limit=500&`))
  assert.deepEqual(asked.slice(1), events.map((event) => `asked https://www.fiba.basketball/en/events/${event}/games`))
})
