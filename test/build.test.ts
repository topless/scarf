import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
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
  // Dated on the fixtures' own day, so their games are still upcoming: Greece v Serbia, 16 Nov 2026.
  assert.match(await readFile(join(dir, 'dist', 'greece/football.ics'), 'utf8'), /^UID:uefa-2047912@scarf\r$/m)
})
