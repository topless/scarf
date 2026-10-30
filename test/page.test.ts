import assert from 'node:assert/strict'
import { test } from 'node:test'
import { teams } from '../src/config.ts'
import type { Game } from '../src/game.ts'
import { renderCountryPage, renderHowItWorks, renderKit, renderLanding, renderTeamPage, WORDS } from '../src/page.ts'

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

test('team page shows venue-local times naming the start and the city, and says when the time is not announced', () => {
  const html = teamPage([timed, unscheduled], site)
  assert.match(html, /<time datetime="2026-10-04T18:45:00Z" data-offset="3">Sun 4 Oct 2026 · Kickoff 21:45 in Thessaloniki<\/time>/)
  assert.match(html, /<time datetime="2026-10-04T18:45:00Z" data-offset="3">Sun · Kickoff 21:45 in Thessaloniki<\/time>/)
  assert.match(html, /Thu · time not announced/)
  assert.match(html, /Venue not announced/)
  assert.match(html, /Greece vs Germany/)
  assert.match(html, /your time/)
})

test('a kickoff without a city reads "at the venue", as in the feed', () => {
  const html = teamPage([{ ...timed, venue: undefined, city: undefined }], site)
  assert.match(html, /<time datetime="2026-10-04T18:45:00Z" data-offset="3">Sun 4 Oct 2026 · Kickoff 21:45 at the venue<\/time>/)
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
  assert.match(html, /On iPhone, set Settings › Apps › Calendar › Default Alert Times › Events to 1 hour before — it covers every timed event, games included\. <a href="\.\.\/\.\.\/how-it-works\/#see-it">See it on an iPhone<\/a>\./)
  assert.match(html, /On Google Calendar, set a notification for this calendar once — it applies to every game\./)
})

test('a choice before the buttons offers the alerts feed: every link and the paste field carry its address', () => {
  const html = teamPage([timed], site)
  const alerts = 'webcal://example.github.io/scarf/greece/football-alerts.ics'
  assert.match(html, /<fieldset class="feed-choice" hidden><legend>Pick your calendar<\/legend>/)
  assert.match(html, /<input type="radio" name="feed-choice" checked autocomplete="off"><span>Games<span class="small">Every game, with a nudge an hour before\.<\/span>/)
  assert.match(
    html,
    /<input type="radio" name="feed-choice" id="alerts-toggle" autocomplete="off"><span>Games and announcements<span class="small">The same games, plus an all-day “New game” entry on the day each one is announced\.<\/span>/,
  )
  inOrder(html, 'Pick your calendar', '<a class="btn-primary"')
  assert.match(html, new RegExp(`<a class="btn-primary" href="[^"]+" data-alerts="${alerts}">Add to my calendar</a>`))
  assert.match(html, new RegExp(`<a class="btn-secondary" href="[^"]+" data-alerts="${alerts}">Apple</a>`))
  assert.ok(html.includes(`data-alerts="https://calendar.google.com/calendar/render?cid=${encodeURIComponent(alerts)}">Google</a>`))
  const outlook = `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(`${site}/greece/football-alerts.ics`)}&amp;name=${encodeURIComponent('Greece football + alerts · scarf')}`
  assert.ok(html.includes(`data-alerts="${outlook}">Outlook</a>`))
  assert.match(html, /<input id="feed-url" type="text" readonly value="[^"]+" data-alerts="https:\/\/example\.github\.io\/scarf\/greece\/football-alerts\.ics">/)
  // The script reveals the choice and swaps the links; without it a plain link still reaches the variant.
  assert.match(html, /getElementById\('alerts-toggle'\)/)
  assert.match(html, new RegExp(`<noscript><p class="small">Want a “New game” entry on the day each game is announced too\\? <a href="${alerts}">Add games and announcements</a> instead\\.</p></noscript>`))
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
  assert.match(football_, /<a class="country-chip" href="\.\.\/\.\.\/greece\/football\/" aria-current="page"><img class="flag" src="\.\.\/\.\.\/flags\/gr\.svg"/)
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

test("landing shows a country in its stripes, with a cell per sport that links the team's page", () => {
  const html = renderLanding([{ team: football, games: [timed] }, { team: basketball, games: [] }])
  assert.match(html, /<article class="card country" id="greece" aria-labelledby="c-greece" style="--stripe: repeating-linear-gradient\(90deg, #0D5EAF 0px 18px, #FFFFFF 18px 36px\)/)
  assert.match(html, /<a class="country-name" href="greece\/"><img class="flag" src="flags\/gr\.svg" width="44" height="33" alt=""><h2 id="c-greece">Greece<\/h2><svg/)
  assert.match(html, /<a class="cell" href="greece\/football\/">\n\s*<span class="cell-sport"><svg[^>]*>.*?<\/svg>Football<small>UEFA<\/small><\/span>/)
  assert.match(html, /<a class="cell" href="greece\/basketball\/">\n\s*<span class="cell-sport"><svg[^>]*stroke="#D9600F"[^>]*>.*?<\/svg>Basketball<small>FIBA<\/small><\/span>/)
  // The next game with its date but no year, the sport's start and the city.
  assert.match(html, /<b>Greece vs Germany<\/b><span class="num"><time datetime="2026-10-04T18:45:00Z" data-offset="3">Sun 4 Oct · Kickoff 21:45 in Thessaloniki<\/time><\/span>/)
  assert.match(html, /No games announced yet/)
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
    renderCountryPage([{ team: football, games: [timed] }, { team: basketball, games: [unscheduled] }], site),
    renderKit(teams),
  ]
  for (const html of pages) {
    const text = copy(html)
    assert.doesNotMatch(text, /!|event-schedule|Event schedule|\bTBA\b|\bTBC\b|\bTBD\b|don't miss/i)
    assert.doesNotMatch(text, /\bv\b/)
  }
})

test('landing has one card per country in alphabetical order, each with a cell per sport, football first', () => {
  const html = renderLanding(teams.map((team) => ({ team, games: [] })))
  const countries = ['england', 'france', 'germany', 'greece', 'spain', 'switzerland']
  assert.equal(html.match(/<article class="card country"/g)?.length, new Set(teams.map((team) => team.country)).size)
  inOrder(html, ...countries.map((country) => `<article class="card country" id="${country}"`))
  // Under the lede, a chip per country that jumps to its card, in the same order.
  inOrder(html, '<p class="lede">', '<nav class="chips" aria-label="Countries">', ...countries.map((country) => `href="#${country}"`), '<article')
  assert.match(html, /<a class="country-chip" href="#england"><img class="flag" src="flags\/gb-eng\.svg" width="20" height="15" alt="">England<\/a>/)
  // Every team has its cell; a sport a country has no team in says so, football before basketball.
  assert.equal(html.match(/<a class="cell" href="/g)?.length, teams.length)
  for (const team of teams) assert.ok(html.includes(`<a class="cell" href="${team.country}/${team.sport}/">`), team.name)
  const england = html.slice(html.indexOf('id="england"'), html.indexOf('id="france"'))
  inOrder(england, 'href="england/football/"', '<div class="cell cell-empty">')
  assert.match(england, /<div class="cell cell-empty"><span class="cell-sport"><svg[^>]*>.*?<\/svg>Basketball<\/span><span>Not on scarf yet<\/span><\/div>/)
  const france = html.slice(html.indexOf('id="france"'), html.indexOf('id="germany"'))
  inOrder(france, '<div class="cell cell-empty"><span class="cell-sport"><svg', 'Football</span><span>Not on scarf yet</span>', 'href="france/basketball/"')
  // Germany lists basketball first in config.ts; its card still puts football first.
  const germany = html.slice(html.indexOf('id="germany"'), html.indexOf('id="greece"'))
  inOrder(germany, 'href="germany/football/"', 'href="germany/basketball/"')
  assert.match(html, /Every kickoff or tip-off, venue, channel and ticket sale/)
})

test('every top bar has the logo home and How it works; a team page adds only its subscribe button', () => {
  const nav = (html: string) => html.slice(html.indexOf('<header'), html.indexOf('</header>'))
  const team = nav(teamPage([timed], site))
  assert.match(team, /<a class="brand" href="\.\.\/\.\.\/">/)
  assert.match(team, /<nav class="site-nav" aria-label="Site"><a class="pill" href="\.\.\/\.\.\/how-it-works\/">How it works<\/a><a class="pill pill-primary" href="#subscribe">Add to my calendar<\/a><\/nav>/)
  assert.doesNotMatch(team, /#teams|#how/)
  assert.doesNotMatch(teamPage([timed], site), /id="how"/)
  assert.match(nav(renderLanding([{ team: football, games: [] }])), /<a class="brand" href="\.\/">.*<a class="pill" href="how-it-works\/">How it works<\/a><\/nav>/s)
  assert.match(nav(renderHowItWorks([{ team: football, games: [] }])), /<a class="brand" href="\.\.\/">.*<a class="pill" href="\.\.\/how-it-works\/">/s)
})

test('how it works pictures the soonest timed game in its own words, and every time in it names its city', () => {
  const later = { ...timed, id: 'uefa-9', kickoff: '2026-10-09T18:45:00Z', date: '2026-10-09' }
  // Basketball's game is sooner; its first game has no time yet, so the pictures come from its second.
  const html = renderHowItWorks(
    [
      { team: football, games: [later] },
      { team: basketball, games: [unscheduled, { ...timed, tv: 'Alpha (Greek TV)' }] },
    ],
    site,
  )
  assert.match(html, /<a class="btn-primary" href="\.\.\/">Pick your team<\/a>/)
  inOrder(html, 'Greece vs Germany · time not announced', 'Sun 4 Oct · Tip-off 21:45 in Thessaloniki', 'Toumba Stadium, Thessaloniki')
  // The reminder as the feed words it: an hour before, at the venue's clock, without the TV hint.
  inOrder(html, 'Sun 4 Oct · 20:45 in Thessaloniki', 'Greece vs Germany tips off in an hour', '<span>Alpha</span>')
  assert.doesNotMatch(html, /Greek TV/)
  assert.doesNotMatch(copy(html), /\d\d:\d\d(?! in )/)
  // The steps name both sports and both sources; the chips open the landing's country cards.
  assert.match(html, /every kickoff or tip-off/)
  assert.match(html, /We rebuild the feeds every day from UEFA and FIBA\./)
  assert.match(html, /<h3>A nudge an hour before the game<\/h3>/)
  assert.match(html, /<a class="country-chip" href="\.\.\/#greece">/)
  // A nudge before midnight falls on the day before.
  const late = renderHowItWorks([{ team: football, games: [{ ...timed, kickoff: '2026-10-04T21:15:00Z' }] }])
  inOrder(late, 'Mon 5 Oct · Kickoff 00:15 in Thessaloniki', 'Sun 4 Oct · 23:15 in Thessaloniki', 'Greece vs Germany kicks off in an hour')
  // Without a timed game the steps go without pictures.
  const plain = renderHowItWorks([{ team: football, games: [unscheduled] }])
  assert.equal(plain.match(/<li class="step">/g)?.length, 3)
  assert.doesNotMatch(plain, /class="scene"/)
  assert.match(plain, /On Google Calendar, set a notification for this calendar once\. It applies to every game\./)
})

test('a basketball page says tip-off and arena, never kickoff or stadium', () => {
  // Both pages get the game without a venue on purpose: a venue name from the data ("Toumba
  // Stadium", "Johan Cruijff ArenA") must not trip the word checks, which are about our own copy.
  const html = renderTeamPage({ team: basketball, games: [unscheduled] }, teams, site)
  assert.match(html, /<meta property="og:description" content="Every game of the Greece men's national basketball team in your calendar: tip-off, venue, TV and tickets, updated daily\.">/)
  assert.match(html, /Every tip-off, arena, channel and ticket sale for the national team/)
  assert.match(html, /We nudge you an hour before tip-off\./)
  assert.match(html, /New games and tip-off times appear a day or two after FIBA announces them\./)
  assert.doesNotMatch(copy(html), /kickoff|stadium/i)
  const timedCourt = renderTeamPage({ team: basketball, games: [{ ...timed, venue: undefined }] }, teams, site)
  assert.match(timedCourt, />Sun 4 Oct 2026 · Tip-off 21:45 in Thessaloniki<\/time>/)
  assert.match(timedCourt, />Sun · Tip-off 21:45 in Thessaloniki<\/time>/)
  assert.doesNotMatch(copy(timedCourt), /kickoff|stadium/i)
  // The football page keeps football's words.
  const football_ = teamPage([unscheduled], site)
  assert.match(football_, /Every kickoff, stadium, channel and ticket sale for the national team/)
  assert.doesNotMatch(copy(football_), /tip-off|arena/i)
})

test("the other-teams chips are one per country, each opening this page's sport or the country's other one", () => {
  const countries = new Set(teams.map((team) => team.country)).size
  const chips = (html: string) => html.slice(html.indexOf('id="teams"'))
  const basketball_ = chips(renderTeamPage({ team: basketball, games: [] }, teams, site))
  assert.equal(basketball_.match(/class="country-chip"/g)?.length, countries)
  inOrder(
    basketball_,
    '<a class="country-chip" href="../../england/football/">',
    '<a class="country-chip" href="../../france/basketball/">',
    '<a class="country-chip" href="../../germany/basketball/">',
    '<a class="country-chip" href="../../greece/basketball/" aria-current="page">',
    '<a class="country-chip" href="../../spain/basketball/">',
    '<a class="country-chip" href="../../switzerland/football/">',
  )
  const football_ = chips(teamPage([], site))
  assert.equal(football_.match(/class="country-chip"/g)?.length, countries)
  inOrder(
    football_,
    'href="../../england/football/"',
    'href="../../france/basketball/"',
    'href="../../germany/football/"',
    'href="../../greece/football/" aria-current="page"',
    'href="../../spain/football/"',
    'href="../../switzerland/football/"',
  )
  assert.doesNotMatch(football_, /<h3>/)
})

test('a team page names its country, linking its page, and switches sport only when the country has more than one', () => {
  const html = teamPage([timed], site)
  assert.match(html, /<a class="country-name" href="\.\.\/"><img class="flag" src="\.\.\/\.\.\/flags\/gr\.svg" width="32" height="24" alt="">Greece<\/a>/)
  assert.match(
    html,
    /<nav class="switch" aria-label="Greece teams"><a href="\.\.\/\.\.\/greece\/football\/" aria-current="page"><svg[^>]*>.*?<\/svg>Football<\/a><a href="\.\.\/\.\.\/greece\/basketball\/"><svg[^>]*stroke="#D9600F"[^>]*>.*?<\/svg>Basketball<\/a><\/nav>/,
  )
  inOrder(html, '<header', '<div class="country-bar">', '<main>')
  // Germany lists basketball first in config.ts; the switch still reads football, then basketball.
  const germany = teams.find((team) => team.country === 'germany' && team.sport === 'basketball')!
  inOrder(renderTeamPage({ team: germany, games: [] }, teams, site), '<nav class="switch"', '>Football</a>', '>Basketball</a>')
  const england = teams.find((team) => team.country === 'england')!
  const english = renderTeamPage({ team: england, games: [] }, teams, site)
  assert.match(english, /<a class="country-name" href="\.\.\/"><img class="flag" src="\.\.\/\.\.\/flags\/gb-eng\.svg" width="32" height="24" alt="">England<\/a>/)
  assert.doesNotMatch(english, /class="switch"/)
})

test("the next-game card carries the sport's drawing, hidden from screen readers", () => {
  for (const html of [teamPage([timed], site), teamPage([], site)]) {
    inOrder(html, '<div class="card-stripe"></div>', '<div class="card-surface"><svg viewBox="0 0 300 190"', 'aria-hidden="true"><rect x="10" y="10" width="280" height="170" rx="2"/><path d="M150 10v170"/><circle cx="150" cy="95" r="26"/>', '<div class="card-body">')
  }
  const court = renderTeamPage({ team: basketball, games: [] }, teams, site)
  assert.match(court, /<div class="card-surface"><svg viewBox="0 0 300 190"[^>]*aria-hidden="true"><rect x="10" y="10" width="280" height="170" rx="2"\/><path d="M150 10v170"\/><circle cx="150" cy="95" r="18"\/>/)
})

test('landing shows every country in its own colours', () => {
  const html = renderLanding(teams.map((team) => ({ team, games: [] })))
  for (const team of teams) {
    const [first, second] = team.colours
    assert.match(html, new RegExp(`<article class="card country" id="${team.country}" aria-labelledby="c-${team.country}" style="--stripe: repeating-linear-gradient\\(90deg, ${first} 0px 18px, ${second} 18px 36px`))
  }
  assert.match(html, /<h2 id="c-switzerland">Switzerland<\/h2>/)
  assert.match(html, /<small>UEFA<\/small>/)
  assert.match(html, /<small>FIBA<\/small>/)
  assert.doesNotMatch(html, /last run/)
})

test('a new team page shows its flag, its own feed and links every other team', () => {
  const spain = teams.find((team) => team.country === 'spain' && team.sport === 'basketball')!
  const html = renderTeamPage({ team: spain, games: [] }, teams, site)
  assert.match(html, /<img class="flag" src="\.\.\/\.\.\/flags\/es\.svg" width="32" height="24" alt="">Spain<\/a>/)
  assert.match(html, /<p class="sport-tag"><svg[^>]*stroke="#D9600F"[^>]*>.*?<\/svg><span>Men's basketball · FIBA<\/span><\/p>/)
  assert.match(html, /<h1>Spain basketball, in your calendar\.<\/h1>/)
  assert.match(html, /<a class="btn-primary" href="webcal:\/\/example\.github\.io\/scarf\/spain\/basketball\.ics" data-alerts="webcal:\/\/example\.github\.io\/scarf\/spain\/basketball-alerts\.ics">/)
  assert.match(html, /<a class="country-chip" href="\.\.\/\.\.\/spain\/basketball\/" aria-current="page">/)
  assert.match(html, /<a class="country-chip" href="\.\.\/\.\.\/germany\/basketball\/"><img class="flag" src="\.\.\/\.\.\/flags\/de\.svg"/)
  // The page band keeps the team's stripes.
  assert.match(html, /<body style="--stripe: repeating-linear-gradient\(90deg, #AA151B 0px 18px, #F1BF00 18px 36px\)/)
  assert.match(html, /Updated daily from FIBA\./)
})

test('every footer carries the motto', () => {
  const pages = [teamPage([timed], site), renderLanding([{ team: football, games: [timed] }]), renderCountryPage([{ team: football, games: [timed] }])]
  for (const html of pages) {
    assert.match(html, /<span>· Wrapped up in the game\.<\/span>/)
  }
})

test("a country page lists the country's teams on its card, under its stripes", () => {
  const html = renderCountryPage([{ team: football, games: [timed] }, { team: basketball, games: [] }], site)
  assert.match(html, /<title>Greece · scarf<\/title>/)
  assert.match(html, /<meta name="description" content="Every Greece game in your calendar: kickoff or tip-off, venue, TV and tickets, updated daily\.">/)
  assert.match(html, /<body style="--stripe: repeating-linear-gradient\(90deg, #0D5EAF 0px 18px, #FFFFFF 18px 36px\)/)
  inOrder(html, '<div class="band"></div>', '<header', '<h1>Greece, in your calendar.</h1>', 'Every kickoff or tip-off, venue', '<article class="card country" id="greece"', '<footer')
  // The page sits at /greece/: assets, flag and team pages are one folder up.
  assert.match(html, /<link rel="stylesheet" href="\.\.\/site\.css">/)
  assert.match(html, /<a class="brand" href="\.\.\/">/)
  assert.match(html, /<div class="country-name"><img class="flag" src="\.\.\/flags\/gr\.svg" width="44" height="33" alt=""><h2 id="c-greece">Greece<\/h2><\/div>/)
  assert.doesNotMatch(html, /<a class="country-name"/)
  inOrder(html, '<a class="cell" href="../greece/football/">', 'Greece vs Germany', '<a class="cell" href="../greece/basketball/">', 'No games announced yet.')
})

test('a country page names only the starts of its own sports', () => {
  const england = teams.find((team) => team.country === 'england')!
  const html = renderCountryPage([{ team: england, games: [] }], site)
  assert.match(html, /content="Every England game in your calendar: kickoff, venue, TV and tickets, updated daily\."/)
  assert.match(html, /Every kickoff, venue, channel and ticket sale/)
  assert.doesNotMatch(copy(html), /tip-off/)
  // The sport England has no team in still shows on the card, as on the landing.
  assert.match(html, /Basketball<\/span><span>Not on scarf yet<\/span>/)
})

test('a country page tells chat apps its address and its own share image, only with a public address', () => {
  const html = renderCountryPage([{ team: football, games: [] }], site)
  assert.match(html, /<meta property="og:url" content="https:\/\/example\.github\.io\/scarf\/greece\/">/)
  assert.match(html, /<meta property="og:image" content="https:\/\/example\.github\.io\/scarf\/greece\/share\.png">/)
  assert.doesNotMatch(renderCountryPage([{ team: football, games: [] }]), /og:url|og:image/)
})

test('the kit shows every team and sport, unlisted and out of search engines', () => {
  const html = renderKit(teams)
  assert.match(html, /<meta name="robots" content="noindex">/)
  assert.doesNotMatch(renderLanding(teams.map((team) => ({ team, games: [] }))), /noindex|kit\//)
  for (const team of teams) {
    // The country card's flag, country link and team link resolve from /kit/, and the team card names its stripes.
    assert.ok(html.includes(`<img class="flag" src="../flags/${team.flag}.svg" width="44" height="33" alt="">`), team.name)
    assert.ok(html.includes(`<a class="country-name" href="../${team.country}/">`), team.name)
    assert.ok(html.includes(`<a class="cell" href="../${team.country}/${team.sport}/">`), team.name)
    assert.ok(html.includes(`<p class="small">${team.name} · <span class="num">${team.colours.join(' · ')}</span></p>`), team.name)
  }
  for (const [sport, words] of Object.entries(WORDS)) {
    assert.ok(html.includes(words.ball) && html.includes(words.surface), sport)
    assert.ok(html.includes(`<dt>Start</dt><dd>${words.start}</dd><dt>Verb</dt><dd>${words.starts}</dd><dt>Ground</dt><dd>${words.ground}</dd>`), sport)
  }
  assert.match(html, /<dt>Source<\/dt><dd>UEFA<\/dd>/)
  assert.match(html, /<dt>Source<\/dt><dd>FIBA<\/dd>/)
})
