import assert from 'node:assert/strict'
import { test } from 'node:test'
import { teams } from '../src/config.ts'
import { flagPath, readFlag } from '../src/flags.ts'

const [football] = teams

test('a flag is served under flags/ by its code', () => {
  assert.equal(flagPath('gr'), 'flags/gr.svg')
  assert.equal(flagPath('gb-eng'), 'flags/gb-eng.svg')
})

test("a team's flag is the 4:3 SVG flag-icons ships for its code", async () => {
  const svg = await readFlag(football)
  assert.match(svg, /^<svg [^>]*viewBox="0 0 640 480"/)
  assert.match(svg, /id="flag-icons-gr"/)
})

test('a code flag-icons has no flag for fails naming the team, so the build stops', async () => {
  await assert.rejects(readFlag({ ...football, flag: 'zz' }), {
    message: 'Greece football: flag-icons has no flag for the code "zz"',
  })
})
