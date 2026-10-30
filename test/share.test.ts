import assert from 'node:assert/strict'
import { test } from 'node:test'
import { shareSize, teams } from '../src/config.ts'
import type { Game } from '../src/game.ts'
import {
  nextGameLine,
  renderCountryShareCard,
  renderCountryShareImage,
  renderLandingShareCard,
  renderLandingShareImage,
  renderShareCard,
  renderShareImage,
  SHARE_MAX_BYTES,
  teamsLine,
} from '../src/share.ts'

const [football, basketball] = teams
const site = 'https://example.github.io/scarf'

const timed: Game = {
  id: 'uefa-1',
  competition: 'UEFA Nations League',
  home: 'Netherlands',
  away: 'Greece',
  date: '2026-11-13',
  kickoff: '2026-11-13T19:45:00Z',
  utcOffsetHours: 1,
  venue: 'Johan Cruijff ArenA',
  city: 'Amsterdam',
}
// The time is out, the stadium is not: UEFA often publishes them in that order.
const noCity: Game = { ...timed, id: 'uefa-3', venue: undefined, city: undefined }
const unscheduled: Game = { id: 'fiba-2', competition: 'Qualifiers', home: 'Greece', away: 'Georgia', date: '2026-11-26' }
// A stand-in in the 4:3 shape flag-icons draws, so the card tests do not depend on the package's art.
const flag = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><rect width="640" height="480" fill="#0D5EAF"/></svg>'

const text = (card: string) => card.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
// The SVGs embedded in a card, in order: the brand mark, a flag when there is one, the large mark.
const svgs = (card: string) => [...card.matchAll(/base64,([A-Za-z0-9+/=]+)"/g)].map((m) => Buffer.from(m[1]!, 'base64').toString())

test('share card names the next game with the venue-local time and its city', () => {
  assert.equal(nextGameLine(timed), 'Netherlands vs Greece · Fri 13 Nov · 20:45 in Amsterdam')
  assert.equal(nextGameLine(noCity), 'Netherlands vs Greece · Fri 13 Nov · 20:45 at the venue')
  assert.equal(nextGameLine(unscheduled), 'Greece vs Georgia · Thu 26 Nov · time not announced')
  assert.equal(nextGameLine(undefined), 'No games announced yet · subscribe and they find you')
  assert.match(text(renderShareCard(football, timed, site, flag)), /NEXT Netherlands vs Greece · Fri 13 Nov · 20:45 in Amsterdam/)
})

test('share card carries the headline, the eyebrow, the flag and the team colours', () => {
  const card = renderShareCard(football, timed, site, flag)
  assert.match(text(card), /scarf .*National team · Men's football .*Greece football, in your calendar\./)
  assert.ok(card.includes(`<img src="data:image/svg+xml;base64,${Buffer.from(flag).toString('base64')}" width="32" height="24">`))
  assert.match(card, /repeating-linear-gradient\(90deg, #0D5EAF 0px 40px, #FFFFFF 40px 80px\)/)
  assert.match(card, /width="340" height="340"/)
  assert.doesNotMatch(renderShareCard(football, timed, site), /width="32" height="24"/)
})

test('share card footer prints the team page without the scheme, and the federation of its source', () => {
  const football_ = text(renderShareCard(football, timed, site, flag))
  assert.match(football_, /example\.github\.io\/scarf\/greece\/football Free · updated daily from UEFA/)
  assert.doesNotMatch(football_, /https?:/)
  assert.match(text(renderShareCard(football, timed, `${site}/`, flag)), /example\.github\.io\/scarf\/greece\/football /)
  assert.match(text(renderShareCard(basketball, undefined, site, flag)), /scarf\/greece\/basketball Free · updated daily from FIBA/)
  assert.match(text(renderShareCard(football, timed)), /scarf\.fan\/greece\/football/)
})

test('share card escapes text from the sources', () => {
  const card = renderShareCard(football, { ...timed, away: 'A <b> & "C"' }, site, flag)
  assert.match(card, /Netherlands vs A &lt;b&gt; &amp; &quot;C&quot;/)
})

test('nothing on a share card breaks the voice rules', () => {
  const cards = [timed, noCity, unscheduled, undefined].map((game) => renderShareCard(football, game, site, flag))
  for (const card of [...cards, renderLandingShareCard(teams, site), renderCountryShareCard([football, basketball], site, flag)]) {
    const copy = text(card)
    assert.doesNotMatch(copy, /!|\bTBA\b|\bTBC\b|\bTBD\b|don't miss|notification/i)
    assert.doesNotMatch(copy, /\bv\b/)
    assert.doesNotMatch(copy, /\d\d:\d\d(?! in | at the venue\b)/)
  }
})

test('landing card carries the brand line, every team by name and no team colours', () => {
  // Two teams stand in for the whole list, so adding a team does not touch this test.
  const card = renderLandingShareCard([football, basketball], site)
  assert.equal(teamsLine([football, basketball]), 'Greece football · Greece basketball')
  assert.match(text(card), /scarf .*National teams · Football and basketball .*Your colours, in your calendar\. .*TEAMS Greece football · Greece basketball/)
  assert.match(text(renderLandingShareCard([football], site)), /National teams · Football /)
  // An ink band where a team's stripe would be, the large mark in terrace red and wool.
  assert.match(card, /height: 28px; background: #17171C; border-bottom: 2\.5px solid #17171C/)
  assert.doesNotMatch(card, /repeating-linear-gradient/)
  const mark = svgs(card).at(-1)!
  assert.match(mark, /fill="#D7263D"\/><rect[^>]+fill="#FBF8F2"/)
  assert.doesNotMatch(mark, /#0D5EAF/)
  assert.match(svgs(renderShareCard(football, timed, site, flag)).at(-1)!, /fill="#0D5EAF"/)
  assert.match(card, /width="340" height="340"/)
})

test('landing card footer prints the site without the scheme, and every federation', () => {
  const copy = text(renderLandingShareCard(teams, site))
  assert.match(copy, /example\.github\.io\/scarf Free · updated daily from UEFA and FIBA/)
  assert.doesNotMatch(copy, /https?:/)
  assert.match(text(renderLandingShareCard(teams, `${site}/`)), /example\.github\.io\/scarf Free/)
  assert.match(text(renderLandingShareCard([football], site)), /scarf Free · updated daily from UEFA /)
  assert.match(text(renderLandingShareCard(teams)), /scarf\.fan Free/)
})

test("country card carries the country's stripes, flag and name, and its teams by name", () => {
  const card = renderCountryShareCard([football, basketball], site, flag)
  assert.match(text(card), /scarf .*National teams · Football and basketball .*Greece, in your calendar\. .*TEAMS Greece football · Greece basketball/)
  assert.ok(card.includes(`<img src="data:image/svg+xml;base64,${Buffer.from(flag).toString('base64')}" width="32" height="24">`))
  assert.match(card, /repeating-linear-gradient\(90deg, #0D5EAF 0px 40px, #FFFFFF 40px 80px\)/)
  assert.match(svgs(card).at(-1)!, /fill="#0D5EAF"/)
  assert.match(text(card), /example\.github\.io\/scarf\/greece Free · updated daily from UEFA and FIBA/)
  // Germany lists basketball first in config.ts; its card still puts football first, as its page does.
  const germany = teams.filter((team) => team.country === 'germany')
  assert.match(text(renderCountryShareCard(germany, site, flag)), /National teams · Football and basketball .*TEAMS Germany football · Germany basketball .*updated daily from UEFA and FIBA/)
  // A country with one team names it as that team's card does.
  const england = teams.find((team) => team.country === 'england')!
  assert.match(text(renderCountryShareCard([england], site, flag)), /National team · Men's football .*England, in your calendar\. .*TEAMS England football .*updated daily from UEFA /)
})

test('every team, country and the landing page render as 1200×630 PNGs under the size limit without a browser', async () => {
  // Every team's real flag goes through resvg here, so a flag it cannot draw (Spain's carries a
  // detailed coat of arms) fails the tests rather than the daily build.
  const pngs: [string, Buffer][] = [['landing', await renderLandingShareImage(teams, site)]]
  for (const team of teams) pngs.push([team.name, await renderShareImage(team, timed, site)])
  for (const country of new Set(teams.map((team) => team.country))) {
    pngs.push([country, await renderCountryShareImage(teams.filter((team) => team.country === country), site)])
  }
  for (const [name, png] of pngs) {
    assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], name)
    // IHDR follows the signature: width and height as big-endian 32-bit integers.
    assert.equal(png.readUInt32BE(16), shareSize.width, name)
    assert.equal(png.readUInt32BE(20), shareSize.height, name)
    assert.ok(png.byteLength < SHARE_MAX_BYTES, `${name}: ${png.byteLength} bytes`)
  }
})
