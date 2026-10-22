import assert from 'node:assert/strict'
import { test } from 'node:test'
import { teams } from '../src/config.ts'
import type { Game } from '../src/game.ts'
import { renderLanding, renderTeamPage } from '../src/page.ts'

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

const teamPage = (games: Game[], siteUrl?: string) => renderTeamPage({ team: football, games }, teams, siteUrl)
// What a fan reads: the page without its script and its tags.
const copy = (html: string) => html.replace(/<script>[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ')

// Every needle is in the html, in the order given.
function inOrder(html: string, ...needles: string[]): void {
  const indexes = needles.map((needle) => {
    const index = html.indexOf(needle)
    assert.notEqual(index, -1, `missing: ${needle}`)
    return index
  })
  for (let i = 1; i < indexes.length; i++) {
    assert.ok(indexes[i - 1]! < indexes[i]!, `${needles[i - 1]} should come before ${needles[i]}`)
  }
}

test('team page shows venue-local times naming the city, and says when the time is not announced', () => {
  const html = teamPage([timed, unscheduled], site)
  assert.match(html, /<time datetime="2026-10-04T18:45:00Z" data-offset="3">Sun 4 Oct 2026 · 21:45 in Thessaloniki<\/time>/)
  assert.match(html, /<time datetime="2026-10-04T18:45:00Z" data-offset="3">Sun · 21:45 in Thessaloniki<\/time>/)
  assert.match(html, /Thu · time not announced/)
  assert.match(html, /Venue not announced/)
  assert.match(html, /Greece vs Germany/)
  assert.match(html, /your time/)
})

test('a kickoff without a city reads "at the venue", as in the feed', () => {
  const html = teamPage([{ ...timed, venue: undefined, city: undefined }], site)
  assert.match(html, /<time datetime="2026-10-04T18:45:00Z" data-offset="3">Sun 4 Oct 2026 · 21:45 at the venue<\/time>/)
})

test('team page escapes text from the sources', () => {
  const html = teamPage([{ ...timed, away: 'A <b> & "C"' }], site)
  assert.match(html, /Greece vs A &lt;b&gt; &amp; &quot;C&quot;/)
  assert.match(html, /href="https:\/\/tickets\.example\/a\?b=1&amp;c=2"/)
})

test('subscribe links point at the feed the build writes, on the public address', () => {
  const html = teamPage([timed], site)
  const webcal = 'webcal://example.github.io/scarf/greece/football.ics'
  assert.match(html, new RegExp(`<a class="btn-primary" href="${webcal}" data-alerts="[^"]+">Add to my calendar</a>`))
  assert.match(html, new RegExp(`<a class="btn-secondary" href="${webcal}" data-alerts="[^"]+">Apple</a>`))
  assert.ok(html.includes(`href="https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}" data-alerts=`))
  assert.ok(html.includes(`addfromweb?url=${encodeURIComponent(`${site}/greece/football.ics`)}&amp;name=${encodeURIComponent('Greece football · scarf')}"`))
  assert.match(html, /<input id="feed-url" type="text" readonly value="https:\/\/example\.github\.io\/scarf\/greece\/football\.ics" data-alerts="[^"]+">/)
  assert.match(html, /<button class="btn-secondary" type="button" data-copy="feed-url">Copy<\/button>/)
  assert.match(html, /On Google Calendar, set a notification for this calendar once — it applies to every game\./)
})

test('a checkbox offers the alerts feed: every link and the paste field carry its address', () => {
  const html = teamPage([timed], site)
  const alerts = 'webcal://example.github.io/scarf/greece/football-alerts.ics'
  assert.match(
    html,
    /<label class="alerts-toggle" hidden><input type="checkbox" id="alerts-toggle" autocomplete="off"><span>Also tell me when a new game is announced<span class="small">An extra all-day entry on the day a new game is announced\. The game itself is in your calendar either way\.<\/span><\/span><\/label>/,
  )
  assert.match(html, new RegExp(`<a class="btn-primary" href="[^"]+" data-alerts="${alerts}">Add to my calendar</a>`))
  assert.match(html, new RegExp(`<a class="btn-secondary" href="[^"]+" data-alerts="${alerts}">Apple</a>`))
  assert.ok(html.includes(`data-alerts="https://calendar.google.com/calendar/render?cid=${encodeURIComponent(alerts)}">Google</a>`))
  const outlook = `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(`${site}/greece/football-alerts.ics`)}&amp;name=${encodeURIComponent('Greece football + alerts · scarf')}`
  assert.ok(html.includes(`data-alerts="${outlook}">Outlook</a>`))
  assert.match(html, /<input id="feed-url" type="text" readonly value="[^"]+" data-alerts="https:\/\/example\.github\.io\/scarf\/greece\/football-alerts\.ics">/)
  // The script reveals the box and swaps the links; without it a plain link still reaches the variant.
  assert.match(html, /getElementById\('alerts-toggle'\)/)
  assert.match(html, new RegExp(`<noscript><p class="small">Want to hear when a new game is announced\\? <a href="${alerts}">Add the feed with alerts</a> instead\\.</p></noscript>`))
})

test('without a public address the page links the feed relative to /greece/football/', () => {
  const html = teamPage([timed])
  assert.match(html, /<a class="btn-primary" href="\.\.\/football\.ics" data-alerts="\.\.\/football-alerts\.ics">/)
  assert.match(html, /<a class="btn-secondary" href="\.\.\/football\.ics" data-alerts="\.\.\/football-alerts\.ics">Calendar file<\/a>/)
  assert.doesNotMatch(html, /webcal:|calendar\.google\.com|outlook|feed-url/)
})

test('team page names the federation of its source, and links every team', () => {
  const football_ = teamPage([timed], site)
  const basketball_ = renderTeamPage({ team: basketball, games: [] }, teams, site)
  assert.match(football_, /Updated daily from UEFA\./)
  assert.doesNotMatch(football_, /last run/)
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
  const html = renderLanding([{ team: football, games: [timed] }, { team: basketball, games: [] }])
  assert.match(html, /<a class="card" href="greece\/football\/" style="--stripe: repeating-linear-gradient\(90deg, #0D5EAF 0px 18px, #FFFFFF 18px 36px\)/)
  assert.match(html, /<a class="card" href="greece\/basketball\/"/)
  assert.match(html, /Next: Greece vs Germany/)
  assert.match(html, /No games announced yet/)
  assert.match(html, /<span>From UEFA<\/span>/)
  assert.match(html, /<span>From FIBA<\/span>/)
  assert.doesNotMatch(html, /Updated daily from UEFA and FIBA|last run/)
  assert.match(html, /<link rel="icon" href="favicon\.svg" type="image\/svg\+xml">/)
})

test('landing tells chat apps its address and its share image', () => {
  const html = renderLanding([{ team: football, games: [timed] }, { team: basketball, games: [] }], site)
  assert.match(html, /<meta property="og:title" content="scarf · Your colours, in your calendar">/)
  assert.match(html, /<meta property="og:description" content="Every game of the national teams we follow in your calendar: kickoff or tip-off, venue, TV and tickets, updated daily\.">/)
  assert.match(html, /<meta property="og:url" content="https:\/\/example\.github\.io\/scarf\/">/)
  assert.match(html, /<meta property="og:image" content="https:\/\/example\.github\.io\/scarf\/share\.png">/)
  assert.match(html, /<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">/)
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/)
})

test('without a public address the landing leaves out the tags that need an absolute address', () => {
  const html = renderLanding([{ team: football, games: [timed] }])
  assert.match(html, /<meta property="og:title" content="scarf · Your colours, in your calendar">/)
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/)
  assert.doesNotMatch(html, /og:url|og:image/)
})

test('nothing a fan reads breaks the voice rules', () => {
  const pages = [
    teamPage([timed, unscheduled], site),
    renderTeamPage({ team: basketball, games: [unscheduled] }, teams, site),
    renderLanding([{ team: football, games: [timed] }, { team: basketball, games: [] }]),
  ]
  for (const html of pages) {
    const text = copy(html)
    assert.doesNotMatch(text, /!|event-schedule|Event schedule|\bTBA\b|\bTBC\b|\bTBD\b|don't miss/i)
    assert.doesNotMatch(text, /\bv\b/)
  }
})

test('landing groups the teams by sport, football first, and names the sport once over its cards', () => {
  const html = renderLanding(teams.map((team) => ({ team, games: [] })))
  assert.match(html, /<section class="wrap sport" aria-labelledby="football">\n  <h2 id="football">Football<\/h2>/)
  assert.match(html, /<section class="wrap sport" aria-labelledby="basketball">\n  <h2 id="basketball">Basketball<\/h2>/)
  assert.equal(html.match(/<section class="wrap sport"/g)?.length, 2)
  // Every football card before the basketball heading, every basketball card after it.
  const [footballSection, basketballSection] = html.split('<h2 id="basketball">')
  const count = (sport: string) => teams.filter((team) => team.sport === sport).length
  assert.equal(footballSection!.match(/<a class="card" href="/g)?.length, count('football'))
  assert.equal(basketballSection!.match(/<a class="card" href="/g)?.length, count('basketball'))
  inOrder(
    html,
    '<h2 id="football">Football</h2>',
    'href="greece/football/"',
    'href="spain/football/"',
    '<h2 id="basketball">Basketball</h2>',
    'href="greece/basketball/"',
    'href="germany/basketball/"',
  )
  assert.match(html, /<p class="card-meta"><span>Men's national team<\/span><span>From UEFA<\/span><\/p>/)
  assert.match(html, /<p class="card-meta"><span>Men's national team<\/span><span>From FIBA<\/span><\/p>/)
  assert.doesNotMatch(html, /National team · Men's/)
  assert.match(html, /Every kickoff or tip-off, venue, channel and ticket sale/)
})

test('a basketball page says tip-off and arena, never kickoff or stadium', () => {
  // Both pages get the game without a venue on purpose: a venue name from the data ("Toumba
  // Stadium", "Johan Cruijff ArenA") must not trip the word checks, which are about our own copy.
  const html = renderTeamPage({ team: basketball, games: [unscheduled] }, teams, site)
  assert.match(html, /<meta property="og:description" content="Every game of the Greece men's national basketball team in your calendar: tip-off, venue, TV and tickets, updated daily\.">/)
  assert.match(html, /Every tip-off, arena, channel and ticket sale for the national team/)
  assert.match(html, /We nudge you an hour before tip-off\./)
  assert.match(html, /New games and tip-off times appear a day or two after FIBA announces them\./)
  assert.match(html, /New games, tip-off times and venues appear on their own/)
  assert.match(html, /<h3>A nudge an hour before tip-off<\/h3>/)
  assert.doesNotMatch(copy(html), /kickoff|stadium/i)
  // The football page keeps football's words.
  const football_ = teamPage([unscheduled], site)
  assert.match(football_, /Every kickoff, stadium, channel and ticket sale for the national team/)
  assert.match(football_, /<h3>A nudge an hour before kickoff<\/h3>/)
  assert.doesNotMatch(copy(football_), /tip-off|arena/i)
})

test("the other-teams chips are grouped by sport, the page's own sport first", () => {
  const basketball_ = renderTeamPage({ team: basketball, games: [] }, teams, site)
  inOrder(
    basketball_,
    '<h3>Basketball</h3>',
    'href="../../greece/basketball/"',
    'href="../../germany/basketball/"',
    '<h3>Football</h3>',
    'href="../../greece/football/"',
    'href="../../spain/football/"',
  )
  assert.equal(basketball_.match(/class="team-chip"/g)?.length, teams.length)
  const football_ = teamPage([], site)
  inOrder(football_, '<h3>Football</h3>', 'href="../../spain/football/"', '<h3>Basketball</h3>', 'href="../../greece/basketball/"')
})

test('landing lists every team, each in its own colours', () => {
  const html = renderLanding(teams.map((team) => ({ team, games: [] })))
  assert.equal(html.match(/<a class="card" href="/g)?.length, teams.length)
  for (const team of teams) {
    const [first, second] = team.colours
    assert.match(html, new RegExp(`<a class="card" href="${team.country}/${team.sport}/" style="--stripe: repeating-linear-gradient\\(90deg, ${first} 0px 18px, ${second} 18px 36px`))
    assert.ok(html.includes(`<p class="card-title">${team.name}</p>`), team.name)
  }
  assert.match(html, /<span>From UEFA<\/span>/)
  assert.match(html, /<span>From FIBA<\/span>/)
  assert.doesNotMatch(html, /last run/)
})

test('a new team page shows its flag, its own feed and links every other team', () => {
  const spain = teams.find((team) => team.country === 'spain' && team.sport === 'basketball')!
  const html = renderTeamPage({ team: spain, games: [] }, teams, site)
  assert.match(html, /<img src="\.\.\/\.\.\/flags\/es\.svg" width="24" height="18" alt="">/)
  assert.match(html, /National team · Men's basketball/)
  assert.match(html, /<h1>Spain basketball, in your calendar\.<\/h1>/)
  assert.match(html, /<a class="btn-primary" href="webcal:\/\/example\.github\.io\/scarf\/spain\/basketball\.ics" data-alerts="webcal:\/\/example\.github\.io\/scarf\/spain\/basketball-alerts\.ics">/)
  assert.equal(html.match(/class="team-chip"/g)?.length, teams.length)
  assert.match(html, /href="\.\.\/\.\.\/spain\/basketball\/" style="[^"]*#AA151B[^"]*" aria-current="page"/)
  assert.match(html, /href="\.\.\/\.\.\/germany\/basketball\/" style="[^"]*#000000 0px 18px, #DD0000 18px 36px, #FFCC00 36px 54px[^"]*"/)
  assert.match(html, /Updated daily from FIBA\./)
})

test('both footers carry the motto', () => {
  const pages = [teamPage([timed], site), renderLanding([{ team: football, games: [timed] }])]
  for (const html of pages) {
    assert.match(html, /<span>· Wrapped up in the game\.<\/span>/)
  }
})
