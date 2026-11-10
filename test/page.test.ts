import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { COUNTRIES, sourceKey, teamPath, teams, type Competition, type Sport, type Team } from '../src/config.ts'
import type { Game } from '../src/game.ts'
import { landingKind, renderCompetitionPage, renderCountryPage, renderHowItWorks, renderKit, renderLanding, renderPrivacy, renderTeamPage, SHARE_SCRIPT, teamKind, WORDS } from '../src/page.ts'

const [football, basketball] = teams
const site = 'https://example.github.io/scarf'
const today = '2026-10-01' // a Thursday, three days before the timed game

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

// The national teams: the country cards, chips and the kit's countries are drawn from these.
const national = teams.filter((team) => !team.club)

// The seed clubs (src/clubs.ts), and more made from them for what the seeds cannot show: a club with
// two sports, a full competition, a club in another country.
const olympiacos = teams.find((team) => team.club?.slug === 'olympiacos')!
const panathinaikos = teams.find((team) => team.club?.slug === 'panathinaikos')!
// Olympiacos without its crest file: the pages fall back to a round swatch of the kit stripes.
const bare: Team = { ...olympiacos, club: { ...olympiacos.club!, crest: undefined } }
const olympiacosFootball: Team = { ...olympiacos, sport: 'football', name: 'Olympiacos football', club: { ...olympiacos.club!, ground: 'Georgios Karaiskakis Stadium', competition: 'champions-league' } }
function clubTeam(name: string, country: Team['country'] = 'greece', competition: Competition = 'euroleague', sport: Sport = 'basketball'): Team {
  const slug = name.toLowerCase().replaceAll(' ', '-')
  const source: Team['source'] = sport === 'football' ? { kind: 'uefa', teamId: 900000 + slug.length * 131 + slug.charCodeAt(0) } : { kind: 'euroleague', season: 'E2026', clubCode: slug.replaceAll('-', '').slice(0, 3).toUpperCase() }
  return { ...olympiacos, country, sport, name: `${name} ${sport}`, colours: ['#123456', '#FFFFFF'], flag: COUNTRIES[country].flag, source, club: { slug, name, city: `${name} City`, ground: `${name} Arena`, competition } }
}
const derby: Game = {
  id: 'euroleague-E2026_1',
  competition: 'EuroLeague · Round 2',
  home: 'Olympiacos',
  away: 'Panathinaikos',
  date: '2026-10-02',
  kickoff: '2026-10-02T18:15:00Z',
  utcOffsetHours: 3,
  venue: 'Peace and Friendship Stadium',
  city: 'Piraeus',
  tv: 'Novasports (Greek TV)',
  sides: [sourceKey(olympiacos), sourceKey(panathinaikos)],
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

test('a kickoff without a venue offset reads in UTC', () => {
  const html = teamPage([{ ...timed, utcOffsetHours: undefined }], site)
  assert.match(html, /<time datetime="2026-10-04T18:45:00Z">Sun 4 Oct 2026 · Kickoff 18:45 UTC<\/time>/)
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
  assert.match(html, /<button class="btn-secondary" type="button" aria-live="polite" data-copy="feed-url">Copy<\/button>/)
  assert.match(html, /On Google Calendar, set a notification for this calendar once\. It applies to every game\./)
  assert.match(html, /On iPhone, set Default Alert Times for events to 1 hour before in the Calendar settings, or the hour-before reminder stays off\./)
  assert.match(html, /Android\/\.test\(navigator\.userAgent\)/)
  assert.match(html, /querySelectorAll\('\.subscribe \.android'\)/)
  assert.match(html, /<div class="android small" hidden>\s*<p>On Android, Google Calendar adds a calendar from a computer\. Open this page there and tap Google, and every game shows up on your phone too\.<\/p>\s*<p>Games not on your phone\? In the Calendar app, open Settings, tap the calendar and turn on Sync\.<\/p>/)
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
  assert.match(football_, /<link rel="preload" href="\.\.\/\.\.\/fonts\/BricolageGrotesque-latin\.woff2" as="font" crossorigin>/)
  assert.doesNotMatch(football_, /fonts\.googleapis\.com|fonts\.gstatic\.com/)
})

test('every font site.css declares is in assets/, and the pages preload only those', () => {
  const css = readFileSync(new URL('../assets/site.css', import.meta.url), 'utf8')
  const declared = Array.from(css.matchAll(/url\((fonts\/[^)]+\.woff2)\)/g), (m) => m[1]!)
  assert.equal(declared.length, 4)
  for (const file of declared) assert.ok(existsSync(new URL(`../assets/${file}`, import.meta.url)), `assets/${file} is missing`)
  // site.css sits at the root, like the landing page, so the same relative path means the same file.
  const preloaded = Array.from(renderLanding([], today, site).matchAll(/<link rel="preload" href="([^"]+)" as="font" crossorigin>/g), (m) => m[1]!)
  assert.equal(preloaded.length, 2)
  for (const href of preloaded) assert.ok(declared.includes(href), `${href} is preloaded but site.css never uses it`)
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

test('landing tells chat apps its address and its share image', () => {
  const html = renderLanding([{ team: football, games: [timed] }, { team: basketball, games: [] }], today, site)
  assert.match(html, /<link rel="icon" href="favicon\.svg" type="image\/svg\+xml">/)
  assert.match(html, /<meta property="og:title" content="scarf · Your colours, in your calendar">/)
  assert.match(html, /<meta property="og:description" content="Every game of the national teams and clubs we follow in your calendar: kickoff or tip-off, venue, TV and tickets, updated daily\.">/)
  assert.match(html, /<meta property="og:url" content="https:\/\/example\.github\.io\/scarf\/">/)
  assert.match(html, /<meta property="og:image" content="https:\/\/example\.github\.io\/scarf\/share\.png">/)
  assert.match(html, /<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">/)
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/)
})

test('without a public address the landing leaves out the tags that need an absolute address', () => {
  const html = renderLanding([{ team: football, games: [timed] }], today)
  assert.match(html, /<meta property="og:title" content="scarf · Your colours, in your calendar">/)
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/)
  assert.doesNotMatch(html, /og:url|og:image/)
})

test('nothing a fan reads breaks the voice rules', () => {
  const pages = [
    teamPage([timed, unscheduled], site),
    renderTeamPage({ team: basketball, games: [unscheduled] }, teams, site),
    renderLanding([{ team: football, games: [timed] }, { team: basketball, games: [] }], today),
    renderCountryPage([{ team: football, games: [timed] }, { team: basketball, games: [unscheduled] }], site),
    renderKit(teams),
    // The club pages, with a game in the week, and the competition's.
    renderTeamPage({ team: olympiacos, games: [derby] }, teams, site),
    renderLanding([{ team: football, games: [timed] }, { team: olympiacos, games: [derby] }, { team: panathinaikos, games: [derby] }], today),
    renderLanding([{ team: football, games: [{ ...timed, date: '2026-10-20' }] }], today),
    renderCountryPage([football, basketball, olympiacos, panathinaikos].map((team) => ({ team, games: [] })), site),
    renderCompetitionPage('euroleague', [{ team: olympiacos, games: [derby] }], site),
    renderPrivacy(site),
  ]
  for (const html of pages) {
    // The spec's one exception: the Google Calendar line names Google's own setting.
    const text = copy(html).replace(/set a notification for this calendar once/g, '')
    assert.doesNotMatch(text, /!|\u2014|event-schedule|Event schedule|\bTBA\b|\bTBC\b|\bTBD\b|don't miss|notification/i)
    assert.doesNotMatch(text, /\bv\b/)
  }
})

test('every top bar has the logo home and How it works; a team page adds only its subscribe button', () => {
  const nav = (html: string) => html.slice(html.indexOf('<header'), html.indexOf('</header>'))
  const team = nav(teamPage([timed], site))
  assert.match(team, /<a class="brand" href="\.\.\/\.\.\/">/)
  assert.match(team, /<nav class="site-nav" aria-label="Site"><a class="pill" href="\.\.\/\.\.\/how-it-works\/">How it works<\/a><a class="pill pill-primary" href="#subscribe">Add to my calendar<\/a><\/nav>/)
  assert.doesNotMatch(team, /#teams|#how/)
  assert.doesNotMatch(teamPage([timed], site), /id="how"/)
  assert.match(nav(renderLanding([{ team: football, games: [] }], today)), /<a class="brand" href="\.\/">.*<a class="pill" href="how-it-works\/">How it works<\/a><\/nav>/s)
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
  // The steps name both sports and both sources; the chips open the country pages.
  assert.match(html, /every kickoff or tip-off/)
  assert.match(html, /We rebuild the feeds every day from UEFA and FIBA\./)
  assert.match(html, /<h2>A nudge an hour before the game<\/h2>/)
  assert.match(html, /<a class="country-chip" href="\.\.\/greece\/">/)
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

test('every list of all the countries or clubs opens with a find field, hidden until its script runs', () => {
  const sections = teams.map((team) => ({ team, games: [] }))
  const pages: [string, string][] = [
    ['Find your team', renderLanding(sections, today)],
    ['Find your country', teamPage([], site)],
    ['Find your country', renderHowItWorks(sections, site)],
    ['Find your club', renderCompetitionPage('euroleague', sections.filter(({ team }) => team.club), site)],
  ]
  for (const [label, html] of pages) {
    inOrder(html, `<div class="find" hidden><label for="find">${label}</label><input id="find" type="search"`, label === 'Find your club' ? '<article class="card club"' : 'class="country-chip"')
    // It filters country chips, club chips and club cards, never This week's chips or the dashed ones,
    // and counts what it keeps in the house voice.
    assert.ok(html.includes("querySelectorAll('.chips .country-chip:not(.more), .comp-clubs .country-chip:not(.more), article.country, article.club')"))
    assert.ok(html.includes("[count(shown.country.size, 'country', 'countries'), count(shown.club.size, 'club', 'clubs')].filter(Boolean).join(' · ') || 'Not on scarf yet'"))
  }
  // A country page lists one country, and the kit is for us.
  assert.doesNotMatch(renderCountryPage([{ team: football, games: [] }], site), /class="find"/)
  assert.doesNotMatch(renderKit(teams), /class="find"/)
})

test("the other-teams chips are one per country, each opening this page's sport or the country's other one", () => {
  const countries = new Set(national.map((team) => team.country)).size
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
    'href="../../france/football/"',
    'href="../../germany/football/"',
    'href="../../greece/football/" aria-current="page"',
    'href="../../spain/football/"',
    'href="../../switzerland/football/"',
  )
  assert.doesNotMatch(football_, /<h3>/)
})

test('a team page names its country, linking its page, and switches sport only when the country has more than one', () => {
  const html = teamPage([timed], site)
  assert.match(html, /<a class="country-name" href="\.\.\/\.\.\/greece\/"><img class="flag" src="\.\.\/\.\.\/flags\/gr\.svg" width="32" height="24" alt="">Greece<\/a>/)
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
  assert.match(english, /<a class="country-name" href="\.\.\/\.\.\/england\/"><img class="flag" src="\.\.\/\.\.\/flags\/gb-eng\.svg" width="32" height="24" alt="">England<\/a>/)
  assert.doesNotMatch(english, /class="switch"/)
})

test('every team page ends its country bar with a Share button for its own address, only with a public address', () => {
  for (const team of teams) {
    const html = renderTeamPage({ team, games: [] }, teams, site)
    const bar = html.slice(html.indexOf('<div class="country-bar">'), html.indexOf('<main>'))
    const button = `<button class="btn-secondary share" type="button" data-share="${site}/${teamPath(team)}/" data-text="${team.name} in your calendar · scarf" aria-live="polite" hidden><svg `
    assert.ok(bar.includes(button), `${team.name}: ${bar}`)
    assert.ok(bar.includes('aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/>'), `${team.name}: the share glyph, hidden from screen readers`)
    assert.ok(bar.includes('</svg>Share</button>\n  </div>'), `${team.name}: Share ends the bar`)
  }
  assert.doesNotMatch(teamPage([timed]), /<button class="btn-secondary share"/)
})

// Runs SHARE_SCRIPT against a stub page and browser, presses Share and returns the button. touch
// says whether the screen's main pointer is a finger, as on a phone.
async function pressShare(navigator: object, touch = true) {
  let press = () => {}
  const button = {
    dataset: { share: 'https://scarf.fan/greece/football/', text: 'Greece football in your calendar · scarf' },
    hidden: true,
    lastChild: { textContent: 'Share' }, // the word after the icon
    addEventListener: (_: string, listener: () => void) => (press = listener),
  }
  const matchMedia = (query: string) => ({ matches: query === '(pointer: coarse)' && touch })
  new Function('document', 'navigator', 'matchMedia', SHARE_SCRIPT)({ title: 'Greece football · scarf', querySelector: () => button }, navigator, matchMedia)
  press()
  await new Promise(setImmediate)
  return button
}

test('Share opens the share sheet on a phone, and copies the address on a desktop or where there is no sheet', async () => {
  const shared: object[] = []
  const copied: string[] = []
  const browser = {
    share: async (data: object) => void shared.push(data),
    clipboard: { writeText: async (text: string) => void copied.push(text) },
  }
  const phone = await pressShare(browser)
  assert.deepEqual(shared, [{ title: 'Greece football · scarf', text: 'Greece football in your calendar · scarf', url: 'https://scarf.fan/greece/football/' }])
  assert.deepEqual(copied, [])
  assert.equal(phone.hidden, false)
  // Safari and Chrome on a Mac have a share menu too; a desktop copies all the same.
  const desktop = await pressShare(browser, false)
  assert.equal(shared.length, 1)
  assert.deepEqual(copied, ['https://scarf.fan/greece/football/'])
  assert.equal(desktop.lastChild.textContent, 'Copied')
  const noSheet = await pressShare({ clipboard: browser.clipboard })
  assert.equal(copied.length, 2)
  assert.equal(noSheet.lastChild.textContent, 'Copied')
  // A fan who closes the share sheet sees no error and no change.
  const closed = await pressShare({ share: async () => Promise.reject(new DOMException('', 'AbortError')) })
  assert.equal(closed.lastChild.textContent, 'Share')
  // A desktop without a clipboard cannot copy, so the button stays hidden.
  assert.equal((await pressShare({ share: browser.share }, false)).hidden, true)
  assert.equal((await pressShare({})).hidden, true)
})

test("the next-game card carries the sport's drawing, hidden from screen readers", () => {
  for (const html of [teamPage([timed], site), teamPage([], site)]) {
    inOrder(html, '<div class="card-stripe"></div>', '<div class="card-surface"><svg viewBox="0 0 300 190"', 'aria-hidden="true"><rect x="10" y="10" width="280" height="170" rx="2"/><path d="M150 10v170"/><circle cx="150" cy="95" r="26"/>', '<div class="card-body">')
  }
  const court = renderTeamPage({ team: basketball, games: [] }, teams, site)
  assert.match(court, /<div class="card-surface"><svg viewBox="0 0 300 190"[^>]*aria-hidden="true"><rect x="10" y="10" width="280" height="170" rx="2"\/><path d="M150 10v170"\/><circle cx="150" cy="95" r="18"\/>/)
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

test('every footer carries the motto and a link to suggest a team or report a bug', () => {
  const pages = [
    teamPage([timed], site),
    renderLanding([{ team: football, games: [timed] }], today),
    renderCountryPage([{ team: football, games: [timed] }]),
    renderHowItWorks([{ team: football, games: [timed] }]),
    renderKit(teams),
    renderTeamPage({ team: olympiacos, games: [] }, teams, site),
    renderCompetitionPage('euroleague', [{ team: olympiacos, games: [] }]),
    renderPrivacy(),
  ]
  for (const html of pages) {
    const footer = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'))
    assert.match(footer, /<span>· Wrapped in the game\.<\/span>/)
    assert.match(footer, /<a class="footer-link" href="\/privacy\/">Privacy<\/a>/)
    assert.match(footer, /<a class="footer-link" href="https:\/\/github\.com\/topless\/scarf\/issues\/new\/choose"><svg [^>]*aria-hidden="true">.*<\/svg>Suggest a team or report a bug<\/a>/)
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
  assert.doesNotMatch(renderLanding(teams.map((team) => ({ team, games: [] })), today), /noindex|kit\//)
  for (const team of national) {
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
  assert.match(html, /<dt>Source<\/dt><dd>FIBA and EuroLeague<\/dd>/)
})

test('the note on TV channels shows only on a page with a TV line', () => {
  assert.match(teamPage([timed]), /TV channels are the expected broadcasters/)
  assert.doesNotMatch(teamPage([unscheduled]), /TV channels/)
})

// The part of a page from the first needle to the next closing tag after it.
const part = (html: string, from: string, to: string) => html.slice(html.indexOf(from), html.indexOf(to, html.indexOf(from)))

test("a club's page carries its crest, name, city and country in the bar, and its competition in the tag and lede", () => {
  const html = renderTeamPage({ team: bare, games: [derby] }, teams, site)
  const bar = part(html, '<div class="country-bar">', '<main>')
  assert.ok(
    bar.includes('<div class="club-id"><span class="crest crest-kit" aria-hidden="true"></span><div><span class="country-name">Olympiacos</span><a class="club-home" href="../../../greece/"><img class="flag" src="../../../flags/gr.svg" width="16" height="12" alt="">Piraeus, Greece</a></div></div>'),
    bar,
  )
  // One Olympiacos team on scarf: nothing to switch to.
  assert.doesNotMatch(bar, /class="switch"/)
  assert.match(html, /<p class="sport-tag"><svg[^>]*stroke="#D9600F"[^>]*>.*?<\/svg><span>Men's basketball · EuroLeague<\/span><\/p>/)
  assert.match(html, /<h1>Olympiacos basketball, in your calendar\.<\/h1>/)
  assert.match(html, /<p class="lede">Every tip-off, arena, channel and ticket sale of our EuroLeague season, kept current in the calendar you already use, with a nudge an hour before we play\. Nothing to install\.<\/p>/)
  // The small print names the source, and the crests' owners (#132); a national team's does not.
  assert.match(html, /Free\. Updated daily from EuroLeague\. Leave any time by deleting the calendar\. Crests are the clubs' trademarks, shown to say whose games these are\. Scarf is not affiliated with any club or competition\. On iPhone, set Default Alert Times[^<]*On Google Calendar/)
  assert.doesNotMatch(teamPage([timed], site), /trademarks|affiliated/)
  // With its file in assets/crests/, the crest takes the swatch's place.
  const crested = renderTeamPage({ team: { ...olympiacos, club: { ...olympiacos.club!, crest: 'olympiacos-basketball.png' } }, games: [] }, teams, site)
  assert.ok(crested.includes('<div class="club-id"><img class="crest" src="../../../crests/olympiacos-basketball.png" width="48" height="48" alt=""><div>'))
  assert.doesNotMatch(crested, /crest-kit/)
})

test("a club's switch toggles its own sports when it has two, and no national switch or country card lists a club", () => {
  const all = [...teams, olympiacosFootball]
  assert.match(
    renderTeamPage({ team: olympiacos, games: [] }, all, site),
    /<nav class="switch" aria-label="Olympiacos teams"><a href="\.\.\/\.\.\/\.\.\/greece\/football\/olympiacos\/"><svg[^>]*>.*?<\/svg>Football<\/a><a href="\.\.\/\.\.\/\.\.\/greece\/basketball\/olympiacos\/" aria-current="page"><svg[^>]*>.*?<\/svg>Basketball<\/a><\/nav>/,
  )
  const greece = renderTeamPage({ team: basketball, games: [] }, all, site)
  const national = part(greece, '<nav class="switch"', '</nav>')
  assert.equal(national.match(/<a /g)?.length, 2)
  assert.doesNotMatch(national, /olympiacos|panathinaikos/)
  // The national team's other teams are the countries' chips, without a club among them.
  assert.doesNotMatch(part(greece, 'id="teams"', '</section>'), /olympiacos|panathinaikos|swatch/i)
  const country = renderCountryPage(all.filter((team) => team.country === 'greece').map((team) => ({ team, games: [] })), site)
  const card = part(country, '<article class="card country"', '</article>')
  assert.equal(card.match(/<a class="cell"/g)?.length, 2)
  assert.doesNotMatch(card, /olympiacos|panathinaikos/i)
})

test("a club's page sits one folder deeper, and every relative link on it climbs three", () => {
  const html = renderTeamPage({ team: olympiacos, games: [derby] }, [...teams, olympiacosFootball], site)
  assert.match(html, /<link rel="stylesheet" href="\.\.\/\.\.\/\.\.\/site\.css">/)
  assert.match(html, /<link rel="preload" href="\.\.\/\.\.\/\.\.\/fonts\/BricolageGrotesque-latin\.woff2" as="font" crossorigin>/)
  assert.match(html, /<a class="brand" href="\.\.\/\.\.\/\.\.\/">/)
  assert.match(html, /<a class="pill" href="\.\.\/\.\.\/\.\.\/how-it-works\/">How it works<\/a>/)
  assert.match(html, /<meta property="og:url" content="https:\/\/example\.github\.io\/scarf\/greece\/basketball\/olympiacos\/">/)
  assert.match(html, /<meta property="og:image" content="https:\/\/example\.github\.io\/scarf\/greece\/basketball\/olympiacos\/share\.png">/)
  assert.ok(html.includes(`data-share="${site}/greece/basketball/olympiacos/" data-text="Olympiacos basketball in your calendar · scarf"`))
  assert.ok(html.includes('<a class="btn-primary" href="webcal://example.github.io/scarf/greece/basketball/olympiacos.ics" data-alerts="webcal://example.github.io/scarf/greece/basketball/olympiacos-alerts.ics">'))
  const relative = Array.from(html.matchAll(/(?:href|src)="(\.\.\/[^"]*)"/g), (m) => m[1]!)
  assert.ok(relative.length > 10)
  for (const href of relative) assert.ok(href.startsWith('../../../') && !href.startsWith('../../../../'), href)
  // Without a public address the feed sits next to the page's folder.
  assert.match(renderTeamPage({ team: olympiacos, games: [] }, teams), /<a class="btn-primary" href="\.\.\/olympiacos\.ics" data-alerts="\.\.\/olympiacos-alerts\.ics">/)
})

test("a club's other teams are its neighbours: its next opponents on scarf, its competition, its country's national teams", () => {
  const rivals = ['Anadolu Efes', 'Baskonia', 'Barcelona', 'Fenerbahce', 'Milan', 'Monaco', 'Paris'].map((name) => clubTeam(name))
  // The source names the sides as it likes ("Hapoel TLV"); the match goes by the source's own ids.
  const game = (away: Team | string, n: number): Game => ({
    ...derby,
    id: `euroleague-E2026_${n}`,
    away: typeof away === 'string' ? away : `${away.club!.name.toUpperCase()} BC`,
    sides: [sourceKey(olympiacos), typeof away === 'string' ? `euroleague:${away.slice(0, 3).toUpperCase()}` : sourceKey(away)],
  })
  // Panathinaikos twice and a club not on scarf, then seven more: six chips, each club once, in the order played.
  const games = [game(panathinaikos, 1), game('Real Madrid', 2), game(panathinaikos, 3), ...rivals.map((rival, i) => game(rival, 10 + i))]
  const html = renderTeamPage({ team: olympiacos, games }, [...national, olympiacos, panathinaikos, ...rivals], site)
  const others = part(html, 'id="teams"', '</section>')
  inOrder(
    others,
    '<h3>Next opponents</h3>',
    '<a class="country-chip" href="../../../greece/basketball/panathinaikos/"><span class="swatch" style="--swatch: repeating-linear-gradient(90deg, #016A41 0px 5px, #FFFFFF 5px 10px)"></span>Panathinaikos</a>',
    '>Anadolu Efes</a>',
    '>Milan</a>',
    '<a class="country-chip more" href="../../../basketball/euroleague/">All 9 EuroLeague clubs<svg',
    '<h3>Greece</h3>',
    '<a class="country-chip" href="../../../greece/football/"><img class="flag" src="../../../flags/gr.svg" width="20" height="15" alt="">Greece football</a>',
    '<a class="country-chip" href="../../../greece/basketball/"><img class="flag" src="../../../flags/gr.svg" width="20" height="15" alt="">Greece basketball</a>',
    '<a class="country-chip more" href="../../../">Every team on scarf<svg',
  )
  assert.equal(others.match(/class="swatch"/g)?.length, 6)
  assert.equal(others.match(/>Panathinaikos</g)?.length, 1)
  assert.doesNotMatch(others, />Monaco<|>Paris<|Real Madrid|class="find"/)
  assert.match(others, /Add as many as you follow: the rivals, the national side\.<\/p>/)
  // A club with two teams on scarf names the other half too.
  assert.match(renderTeamPage({ team: olympiacos, games: [] }, [...national, olympiacos, olympiacosFootball], site), /Add as many as you follow: the rivals, the national side, the other half of the club\.<\/p>/)
})

test('a country page shows its clubs in Europe after its national teams, football first, then by name', () => {
  const sections = [football, basketball, panathinaikos, olympiacos, olympiacosFootball].map((team) => ({ team, games: team === olympiacos ? [derby] : [] }))
  const html = renderCountryPage(sections, site)
  inOrder(
    html,
    '<article class="card country" id="greece"',
    '<h2 id="europe">In Europe this season</h2><p class="aside">Three clubs · Champions League and EuroLeague</p>',
    'href="../greece/football/olympiacos/"',
    'href="../greece/basketball/olympiacos/"',
    'href="../greece/basketball/panathinaikos/"',
    '<footer',
  )
  assert.equal(html.match(/<article class="card club"/g)?.length, 3)
  // A card: the kit stripes, the sport first, the crest, the name, home with a small flag, the next game, the way in.
  assert.ok(html.includes('<article class="card club" style="--stripe: repeating-linear-gradient(90deg, #D30D24 0px 18px, #FFFFFF 18px 36px)'))
  assert.match(
    html,
    /<span class="cell-sport"><svg[^>]*stroke="#D9600F"[^>]*>.*?<\/svg>Basketball<small>EuroLeague<\/small><\/span>\n\s*<div class="club-head"><img class="crest" src="\.\.\/crests\/olympiacos-basketball\.png" width="44" height="44" alt=""><div><h3 class="club-name"><a href="\.\.\/greece\/basketball\/olympiacos\/">Olympiacos<\/a><\/h3><div class="club-home"><img class="flag" src="\.\.\/flags\/gr\.svg" width="16" height="12" alt="">Piraeus · Peace and Friendship Stadium<\/div><\/div><\/div>/,
  )
  assert.match(html, /<b>Olympiacos vs Panathinaikos<\/b><span class="num"><time datetime="2026-10-02T18:15:00Z" data-offset="3">Fri 2 Oct · Tip-off 21:15 in Piraeus<\/time><\/span>/)
  assert.match(html, /Football<small>Champions League<\/small>/)
  assert.match(html, /<a class="cell-cta" href="\.\.\/greece\/basketball\/olympiacos\/">Games and subscribe<svg/)
  assert.match(part(html, 'basketball/panathinaikos/">Panathinaikos', '</article>'), /No games announced yet\./)
  assert.doesNotMatch(renderCountryPage([{ team: football, games: [] }], site), /In Europe this season|card club/)
})

test('a country with clubs and no national team on scarf shows its clubs alone, and no list of national teams names it', () => {
  // Spain stands in for such a country (Monaco, the Emirates): only its club is given.
  const madrid = clubTeam('Real Madrid', 'spain')
  const html = renderCountryPage([{ team: madrid, games: [] }], site)
  assert.match(html, /<title>Spain · scarf<\/title>/)
  assert.match(html, /<body style="--stripe: repeating-linear-gradient\(90deg, #AA151B 0px 18px, #F1BF00 18px 36px\)/)
  assert.match(html, /content="Every Spain game in your calendar: tip-off, venue, TV and tickets, updated daily\."/)
  assert.doesNotMatch(html, /card country/)
  inOrder(html, '<h1>Spain, in your calendar.</h1>', '<p class="aside">One club · EuroLeague</p>', '<a href="../spain/basketball/real-madrid/">Real Madrid</a></h3>', '<img class="flag" src="../flags/es.svg" width="16" height="12" alt="">')
  // Its club's page names the country, with no national team to offer.
  const page = renderTeamPage({ team: madrid, games: [] }, [football, basketball, madrid], site)
  assert.match(page, /<img class="flag" src="\.\.\/\.\.\/\.\.\/flags\/es\.svg" width="16" height="12" alt="">Real Madrid City, Spain<\/a>/)
  assert.match(page, /<h3>Spain<\/h3>/)
  assert.match(page, /Add as many as you follow: the rivals\.<\/p>/)
  // The landing, How it works and a national team's other teams list Greece, not Spain.
  const sections = [football, basketball, madrid].map((team) => ({ team, games: [] }))
  const lists = [
    part(renderLanding(sections, today), '<nav class="chips" aria-label="Countries">', '</nav>'),
    part(renderHowItWorks(sections), '<nav class="chips" aria-label="Countries">', '</nav>'),
    part(renderTeamPage({ team: football, games: [] }, [football, basketball, madrid], site), 'id="teams"', '</section>'),
  ]
  for (const list of lists) {
    assert.match(list, />Greece<\/a>/)
    assert.doesNotMatch(list, /Spain|spain/)
  }
})

test('a competition page lists its clubs A to Z under a find field, with no stripes and no share image', () => {
  const efes = clubTeam('Anadolu Efes', 'turkiye')
  const html = renderCompetitionPage('euroleague', [olympiacos, panathinaikos, efes].map((team) => ({ team, games: [] })), site)
  assert.match(html, /<title>EuroLeague · scarf<\/title>/)
  assert.match(html, /<meta name="description" content="Every EuroLeague club's games in your calendar: tip-off, arena, TV and tickets, updated daily\.">/)
  assert.match(html, /<meta property="og:url" content="https:\/\/example\.github\.io\/scarf\/basketball\/euroleague\/">/)
  assert.doesNotMatch(html, /og:image|class="band"|<body style/)
  inOrder(
    html,
    "<p class=\"sport-tag\"><svg",
    "<span>Men's basketball · 3 clubs</span></p>",
    '<h1>EuroLeague, club by club.</h1>',
    '<p class="lede">Three clubs, one calendar each. Pick yours and every tip-off, arena, channel and ticket sale of its European nights lands in the calendar you already use, with a nudge an hour before. Nothing to install.</p>',
    '<div class="find" hidden><label for="find">Find your club</label>',
    '<h2 id="the-clubs">The clubs</h2><p class="aside">2026-27 season · A to Z</p>',
    '>Anadolu Efes</a>',
    '>Olympiacos</a>',
    '>Panathinaikos</a>',
  )
  // From /basketball/euroleague/, a card links the club's page under its country.
  assert.ok(html.includes('<h3 class="club-name"><a href="../../turkiye/basketball/anadolu-efes/">Anadolu Efes</a></h3><div class="club-home"><img class="flag" src="../../flags/tr.svg" width="16" height="12" alt="">Anadolu Efes City · Anadolu Efes Arena</div>'))
  assert.match(html, /<link rel="stylesheet" href="\.\.\/\.\.\/site\.css">/)
  assert.match(html, /getElementById\('find'\)/)
  // A crest file shows at 44 px on a card; one club reads in the singular.
  const crested = renderCompetitionPage('euroleague', [{ team: { ...olympiacos, club: { ...olympiacos.club!, crest: 'olympiacos-basketball.png' } }, games: [] }], site)
  assert.ok(crested.includes('<div class="club-head"><img class="crest" src="../../crests/olympiacos-basketball.png" width="44" height="44" alt=""><div>'))
  assert.match(crested, /<p class="lede">One club, one calendar\. Pick yours/)
})

test('the landing carries a chip for every club, the ones beyond six hidden, each found by name, city and country', () => {
  const clubs = teams.filter((team) => team.club)
  const html = renderLanding(teams.map((team) => ({ team, games: [] })), today)
  const chips = html.match(/<a class="country-chip" href="[^"]*"( data-find="[^"]*")?( data-extra hidden)?><span class="swatch"/g) ?? []
  assert.equal(chips.length, clubs.length)
  assert.ok(chips.some((chip) => chip.includes('data-extra hidden')))
  assert.ok(chips.every((chip) => chip.includes('data-find=')))
  assert.match(html, /data-find="Olympiacos Piraeus Greece"/)
  assert.ok(html.includes('el.dataset.find ?? '))
})

test("a This week row puts the home side's chip first by the source's ids, whatever the source calls the clubs", () => {
  const home = clubTeam('Hapoel Tel Aviv', 'israel')
  const away = clubTeam('Olimpia Milano', 'italy')
  const game: Game = { ...derby, id: 'euroleague-E2026_77', home: 'Hapoel TLV', away: 'Milan', date: today, sides: [sourceKey(home), sourceKey(away)] }
  // The away club is listed first; the row still leads with the home side.
  const html = renderLanding([{ team: away, games: [game] }, { team: home, games: [game] }], today)
  const row = part(html, '<li class="row">', '</li>')
  inOrder(row, 'Hapoel TLV vs Milan', '>Hapoel Tel Aviv</a>', '>Olimpia Milano</a>')
  assert.equal(row.match(/class="swatch"/g)?.length, 2)
})

test('the landing lists the competitions with their clubs, then every country with a national team as a chip to its page', () => {
  const rivals = ['Milan', 'Baskonia', 'Barcelona', 'Fenerbahce', 'Anadolu Efes'].map((name) => clubTeam(name))
  const html = renderLanding([...national, olympiacos, panathinaikos, olympiacosFootball, ...rivals].map((team) => ({ team, games: [] })), today)
  inOrder(
    html,
    '<p class="lede">Pick your team, a national side or a club, and subscribe once. Every kickoff or tip-off, venue, channel and ticket sale lands in the calendar you already use, with a nudge an hour before the game. Nothing to install.</p>',
    '<div class="find" hidden><label for="find">Find your team</label>',
    '<h2 id="clubs">Clubs in Europe</h2><p class="aside">Two competitions · 8 clubs</p>',
    'Champions League<svg',
    "<p class=\"small\">Men's football · 1 club · Tuesday and Wednesday nights, September to May</p>",
    '<a class="cell-cta" href="football/champions-league/">All 1 club<svg',
    'EuroLeague<svg',
    `<h2 id="national">National teams</h2><p class="aside">${new Set(national.map((team) => team.country)).size} countries · men's football and basketball</p>`,
    '<a class="country-chip" href="england/"><img class="flag" src="flags/gb-eng.svg" width="20" height="15" alt="">England</a>',
    '<a class="country-chip" href="greece/">',
    '<footer',
  )
  inOrder(
    part(html, 'EuroLeague<svg', '</article>'),
    "<p class=\"small\">Men's basketball · 7 clubs · Thursday and Friday nights, October to May</p>",
    // Six chips A to Z with their kit swatches, the rest counted.
    '<a class="country-chip" href="greece/basketball/anadolu-efes/" data-find="Anadolu Efes',
    '>Barcelona</a>',
    '>Baskonia</a>',
    '>Fenerbahce</a>',
    '>Milan</a>',
    '>Olympiacos</a>',
    '<span class="country-chip more">and 1 more</span>',
    '<a class="cell-cta" href="basketball/euroleague/">All 7 clubs<svg',
  )
  // The name is the way in too, with the arrow a country's name carries.
  assert.match(html, /<h3 class="comp-name"><a href="basketball\/euroleague\/"><svg[^>]*stroke="#D9600F"[^>]*>.*?<\/svg>EuroLeague<svg[^>]*>.*?<\/svg><\/a><\/h3>/)
  // The country cards are gone: the chips said the same.
  assert.doesNotMatch(html, /<article class="card country"|href="#/)
  // The seventh club is in the page for the Find field, hidden, and "and 1 more" stays for the default view.
  assert.match(html, /<a class="country-chip" href="greece\/basketball\/panathinaikos\/" data-find="Panathinaikos Athens Greece" data-extra hidden>/)
  const chips = part(html, '<nav class="chips" aria-label="Countries">', '</nav>')
  assert.equal(chips.match(/class="country-chip"/g)?.length, new Set(national.map((team) => team.country)).size)
  // Without clubs there is no clubs section.
  assert.doesNotMatch(renderLanding([{ team: football, games: [] }], today), /Clubs in Europe/)
})

test('This week lists every game of the next seven days once, with the chips of the teams playing', () => {
  const late = { ...timed, id: 'uefa-late', date: '2026-10-08', kickoff: '2026-10-08T18:45:00Z' } // the eighth day
  const played = { ...timed, id: 'uefa-old', date: '2026-09-30', kickoff: '2026-09-30T18:45:00Z' }
  const club = { team: olympiacos, games: [derby] }
  const rival = { team: panathinaikos, games: [derby] }
  const html = renderLanding([{ team: football, games: [played, timed, late] }, club, rival], today)
  const week = part(html, 'aria-labelledby="week"', '</section>')
  assert.match(week, /<h2 id="week">This week<\/h2><p class="aside">Every game on scarf, Thursday 1 to Wednesday 7 October<\/p>/)
  assert.equal(week.match(/<li class="row">/g)?.length, 2)
  inOrder(
    week,
    '<span class="row-day">2 Oct</span><span class="row-time num"><time datetime="2026-10-02T18:15:00Z" data-offset="3">Fri · Tip-off 21:15 in Piraeus</time></span>',
    '<span class="row-title">Olympiacos vs Panathinaikos</span><span class="row-meta">EuroLeague · Peace and Friendship Stadium, Piraeus</span>',
    '<div class="row-teams">',
    '<a class="country-chip" href="greece/basketball/olympiacos/"><span class="swatch"',
    '<a class="country-chip" href="greece/basketball/panathinaikos/"><span class="swatch"',
    '<span class="row-day">4 Oct</span>',
    'Sun · Kickoff 21:45 in Thessaloniki',
    '<span class="row-meta">UEFA Nations League · Toumba Stadium, Thessaloniki</span>',
    '<a class="country-chip" href="greece/football/"><img class="flag" src="flags/gr.svg" width="20" height="15" alt="">Greece</a>',
  )
  assert.doesNotMatch(week, /Tickets|Alpha|Greek TV|8 Oct|30 Sep|National teams play in windows/)
  // The home side's chip comes first, whichever team the build listed first.
  inOrder(part(renderLanding([rival, club], today), 'aria-labelledby="week"', '</section>'), '>Olympiacos</a>', '>Panathinaikos</a>')
  // A week of club games only says when the national teams play next.
  assert.match(renderLanding([{ team: football, games: [late] }, club], today), /<p class="small">National teams play in windows, not every week\. The next one opens on 8 October\.<\/p>/)
  // A week without games names the day of the next one; without any game there is no section.
  const quiet = renderLanding([{ team: football, games: [late] }], today)
  assert.match(quiet, /<p>No games this week\. The next one is on 8 October\.<\/p>/)
  assert.doesNotMatch(quiet, /<li class="row">|National teams play in windows/)
  assert.doesNotMatch(renderLanding([{ team: football, games: [] }], today), /This week/)
  // A week across two months names both.
  assert.match(renderLanding([club], '2026-09-28'), /Every game on scarf, Monday 28 September to Sunday 4 October/)
})

test('the overflow asides say how many rows are shown and that every game is still in the feed', () => {
  const many = Array.from({ length: 13 }, (_, i) => ({ ...timed, id: `uefa-${i}` }))
  const full = teamPage(many)
  assert.equal(full.match(/<li class="row">/g)?.length, 12)
  assert.match(full, /The next 12 here · all 13 are already in the feed/)
  const exact = teamPage(many.slice(0, 12))
  assert.equal(exact.match(/<li class="row">/g)?.length, 12)
  assert.match(exact, /All 12 are already in the feed/)
  const busy = Array.from({ length: 10 }, (_, i) => ({ ...timed, id: `uefa-${i}`, date: today, kickoff: `${today}T18:45:00Z` }))
  const week = part(renderLanding([{ team: football, games: busy }], today), 'aria-labelledby="week"', '</section>')
  assert.equal(week.match(/<li class="row">/g)?.length, 8)
  assert.match(week, /The first 8 of 10 this week\. Every game is on its team's page\./)
})

test("the kit shows each club's team card after the countries, so a new club's stripes can be checked", () => {
  inOrder(
    renderKit(teams),
    '<h2 id="kit-countries">Countries</h2>',
    '<h2 id="kit-clubs">Clubs</h2>',
    '<p class="small">Olympiacos basketball · <span class="num">#D30D24 · #FFFFFF</span></p>',
    '<p class="small">Panathinaikos basketball · <span class="num">#016A41 · #FFFFFF</span></p>',
    '<h2 id="kit-sports">Sports</h2>',
  )
  assert.doesNotMatch(renderKit(national), /kit-clubs/)
})

test('the share images name a team a national team or a club, and say what a list of teams holds', () => {
  assert.equal(teamKind(football), "National team · Men's football")
  assert.equal(teamKind(olympiacos), "Club · Men's basketball")
  assert.equal(landingKind([football, basketball]), 'National teams · Football and basketball')
  assert.equal(landingKind(teams), 'National teams and clubs · Football and basketball')
  assert.equal(landingKind([olympiacos, panathinaikos]), 'Clubs · Basketball')
})

test('the privacy page says what is counted, in scarf\'s own voice', () => {
  const html = renderPrivacy(site)
  assert.match(html, /<title>Privacy · scarf<\/title>/)
  for (const heading of ['What scarf records', 'What scarf never records', 'Who handles the data', 'How to opt out']) assert.match(html, new RegExp(`<h2>${heading}</h2>`))
  assert.doesNotMatch(copy(html), /\bwe\b|\bour\b|Google|Grafana|dashboard/i)
})
