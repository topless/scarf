import assert from 'node:assert/strict'
import { test } from 'node:test'
import { teams } from '../src/config.ts'
import type { Game } from '../src/game.ts'
import { renderLanding, renderTeamPage } from '../src/page.ts'

const now = new Date('2026-10-02T06:00:00Z')
const [football, basketball] = teams
const site = 'https://example.github.io/scarf'

const timed: Game = {
  id: 'uefa-1',
  competition: 'UEFA Nations League',
  home: 'Greece',
  away: 'Germany',
  date: '2026-10-04',
  kickoff: '2026-10-04T18:45:00Z',
  utcOffsetHours: 3,
  venue: 'Toumba Stadium',
  city: 'Thessaloniki',
  tv: 'Alpha',
  tickets: 'https://tickets.example/a?b=1&c=2',
}
const unscheduled: Game = { id: 'fiba-2', competition: 'Qualifiers', home: 'Greece', away: 'Georgia', date: '2026-11-26' }

const teamPage = (games: Game[], siteUrl?: string) => renderTeamPage({ team: football, games }, teams, now, siteUrl)

test('team page shows venue-local times naming the city, and says when the time is not announced', () => {
  const html = teamPage([timed, unscheduled], site)
  assert.match(html, /<time datetime="2026-10-04T18:45:00Z" data-offset="3">Sun 4 Oct 2026 · 21:45 in Thessaloniki<\/time>/)
  assert.match(html, /<time datetime="2026-10-04T18:45:00Z" data-offset="3">Sun · 21:45 in Thessaloniki<\/time>/)
  assert.match(html, /Thu · time not announced/)
  assert.match(html, /Venue not announced/)
  assert.match(html, /Greece vs Germany/)
  assert.match(html, /your time/)
})

test('team page escapes text from the sources', () => {
  const html = teamPage([{ ...timed, away: 'A <b> & "C"' }], site)
  assert.match(html, /Greece vs A &lt;b&gt; &amp; &quot;C&quot;/)
  assert.match(html, /href="https:\/\/tickets\.example\/a\?b=1&amp;c=2"/)
})

test('subscribe links point at the feed the build writes, on the public address', () => {
  const html = teamPage([timed], site)
  const webcal = 'webcal://example.github.io/scarf/greece/football.ics'
  assert.match(html, new RegExp(`<a class="btn-primary" href="${webcal}">Add to my calendar</a>`))
  assert.match(html, new RegExp(`<a class="btn-secondary" href="${webcal}">Apple</a>`))
  assert.ok(html.includes(`href="https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}">Google</a>`))
  assert.ok(html.includes(`addfromweb?url=${encodeURIComponent(`${site}/greece/football.ics`)}&amp;`))
  assert.match(html, /<input id="feed-url" type="text" readonly value="https:\/\/example\.github\.io\/scarf\/greece\/football\.ics">/)
  assert.match(html, /<button class="btn-secondary" type="button" data-copy="feed-url">Copy<\/button>/)
  assert.match(html, /On Google Calendar, set a notification for this calendar once — it applies to every game\./)
})

test('without a public address the page links the feed relative to /greece/football/', () => {
  const html = teamPage([timed])
  assert.match(html, /<a class="btn-primary" href="\.\.\/football\.ics">/)
  assert.doesNotMatch(html, /webcal:|calendar\.google\.com|outlook|feed-url/)
})

test('team page names the federation of its source, and links every team', () => {
  const football_ = teamPage([timed], site)
  const basketball_ = renderTeamPage({ team: basketball, games: [] }, teams, now, site)
  assert.match(football_, /Updated daily from UEFA\./)
  assert.match(football_, /Updated daily from UEFA · last run Fri 2 Oct 2026, 06:00 UTC/)
  assert.match(basketball_, /Updated daily from FIBA\./)
  assert.match(football_, /<a class="team-chip" href="\.\.\/\.\.\/greece\/football\/" style="[^"]*#0D5EAF[^"]*" aria-current="page">/)
  assert.match(football_, /href="\.\.\/\.\.\/greece\/basketball\/"/)
  assert.match(football_, /<link rel="stylesheet" href="\.\.\/\.\.\/brand-tokens\.css">/)
  assert.match(football_, /<link rel="apple-touch-icon" href="\.\.\/\.\.\/apple-touch-icon\.png">/)
  assert.match(football_, /fonts\.googleapis\.com\/css2\?family=Albert\+Sans[^"]*Bricolage\+Grotesque[^"]*display=swap/)
})

test('team page tells chat apps its title, description and share image', () => {
  const html = teamPage([timed], site)
  assert.match(html, /<meta property="og:title" content="Greece football · scarf">/)
  assert.match(html, /<meta property="og:description" content="Every game of the Greece men's national football team in your calendar: kickoff, venue, TV and tickets, updated daily\.">/)
  assert.match(html, /<meta property="og:url" content="https:\/\/example\.github\.io\/scarf\/greece\/football\/">/)
  assert.match(html, /<meta property="og:image" content="https:\/\/example\.github\.io\/scarf\/greece\/football\/share\.png">/)
  assert.match(html, /<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">/)
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/)
})

test('without a public address the page leaves out the tags that need an absolute address', () => {
  const html = teamPage([timed])
  assert.match(html, /<meta property="og:title" content="Greece football · scarf">/)
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/)
  assert.doesNotMatch(html, /og:url|og:image/)
})

test('team page says so when no games are announced', () => {
  const html = teamPage([], site)
  assert.match(html, /No games announced yet/)
  assert.doesNotMatch(html, /<ul class="rows">/)
})

test('landing lists every team with its stripe and a link to its page', () => {
  const html = renderLanding([{ team: football, games: [timed] }, { team: basketball, games: [] }], now)
  assert.match(html, /<a class="card" href="greece\/football\/" style="--stripe: repeating-linear-gradient\(90deg, #0D5EAF 0px 18px, #FFFFFF 18px 36px\)/)
  assert.match(html, /<a class="card" href="greece\/basketball\/"/)
  assert.match(html, /Next: Greece vs Germany/)
  assert.match(html, /No games announced yet/)
  assert.match(html, /Updated daily from UEFA and FIBA/)
  assert.match(html, /<link rel="icon" href="favicon\.svg" type="image\/svg\+xml">/)
})

test('landing tells chat apps its address and its share image', () => {
  const html = renderLanding([{ team: football, games: [timed] }, { team: basketball, games: [] }], now, site)
  assert.match(html, /<meta property="og:title" content="scarf · Your colours, in your calendar">/)
  assert.match(html, /<meta property="og:description" content="Every game of the national teams we follow in your calendar: kickoff, venue, TV and tickets, updated daily\.">/)
  assert.match(html, /<meta property="og:url" content="https:\/\/example\.github\.io\/scarf\/">/)
  assert.match(html, /<meta property="og:image" content="https:\/\/example\.github\.io\/scarf\/share\.png">/)
  assert.match(html, /<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">/)
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/)
})

test('without a public address the landing leaves out the tags that need an absolute address', () => {
  const html = renderLanding([{ team: football, games: [timed] }], now)
  assert.match(html, /<meta property="og:title" content="scarf · Your colours, in your calendar">/)
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/)
  assert.doesNotMatch(html, /og:url|og:image/)
})

test('nothing a fan reads breaks the voice rules', () => {
  const pages = [teamPage([timed, unscheduled], site), renderLanding([{ team: football, games: [timed] }], now)]
  for (const html of pages) {
    const text = html.replace(/<script>[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ')
    assert.doesNotMatch(text, /!|event-schedule|Event schedule|\bTBA\b|\bTBC\b|don't miss/i)
    assert.doesNotMatch(text, /\bv\b/)
  }
})

test('landing lists all six teams, each in its own colours', () => {
  const html = renderLanding(teams.map((team) => ({ team, games: [] })), now)
  assert.equal(html.match(/<a class="card" href="/g)?.length, 6)
  for (const team of teams) {
    const [first, second] = team.colours
    assert.match(html, new RegExp(`<a class="card" href="${team.country}/${team.sport}/" style="--stripe: repeating-linear-gradient\\(90deg, ${first} 0px 18px, ${second} 18px 36px`))
    assert.ok(html.includes(`<p class="card-title">${team.name}</p>`), team.name)
  }
  assert.match(html, /Updated daily from UEFA and FIBA/)
})

test('a new team page shows its flag, its own feed and links every other team', () => {
  const spain = teams.find((team) => team.country === 'spain' && team.sport === 'basketball')!
  const html = renderTeamPage({ team: spain, games: [] }, teams, now, site)
  assert.match(html, /<img src="\.\.\/\.\.\/flags\/es\.svg" width="24" height="18" alt="">/)
  assert.match(html, /National team · Men's basketball/)
  assert.match(html, /<h1>Spain basketball, in your calendar\.<\/h1>/)
  assert.match(html, /<a class="btn-primary" href="webcal:\/\/example\.github\.io\/scarf\/spain\/basketball\.ics">/)
  assert.equal(html.match(/class="team-chip"/g)?.length, 6)
  assert.match(html, /href="\.\.\/\.\.\/spain\/basketball\/" style="[^"]*#AA151B[^"]*" aria-current="page"/)
  assert.match(html, /href="\.\.\/\.\.\/germany\/basketball\/" style="[^"]*#000000 0px 18px, #DD0000 18px 36px, #FFCC00 36px 54px[^"]*"/)
  assert.match(html, /Updated daily from FIBA\./)
})
