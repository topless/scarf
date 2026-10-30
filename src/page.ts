import { readFileSync } from 'node:fs'
import { alertsFeedPath, countrySharePath, feedName, feedPath, landingSharePath, sharePath, shareSize, siteName, type Sport, type Team } from './config.ts'
import { flagPath } from './flags.ts'
import type { Game } from './game.ts'

// Team pages and the landing page, ported from reference/team-page.html. Styles live in
// assets/site.css on top of assets/brand-tokens.css; both are copied into dist/ by the build.

export interface Section {
  team: Team
  games: Game[]
}

const utc = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options })
const WEEKDAY = utc({ weekday: 'short' })
const DAY_MONTH = utc({ day: 'numeric', month: 'short' })
const YEAR = utc({ year: 'numeric' })
const TIME = utc({ hour: '2-digit', minute: '2-digit' })
export const shortDate = (d: Date) => `${WEEKDAY.format(d)} ${DAY_MONTH.format(d)}` // "Fri 13 Nov"
const longDate = (d: Date) => `${shortDate(d)} ${YEAR.format(d)}`

const GOOGLE_NOTE = 'On Google Calendar, set a notification for this calendar once — it applies to every game.'

const icon = (paths: string, stroke = 'currentColor') =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
// A pitch or court in faint ink lines. Decoration only, so screen readers skip it.
const drawing = (paths: string) =>
  `<svg viewBox="0 0 300 190" width="100%" height="100%" fill="none" stroke="#17171C" stroke-opacity="0.28" stroke-width="1.6" aria-hidden="true">${paths}</svg>`

// Each sport's own words for the start of a game, the verb for it and the ground it is played on,
// so neither a basketball page nor a basketball calendar promises a kickoff in a stadium (the feeds
// in ics.ts read them from here), and its marks: the ball icon and a drawing of the pitch or court.
// Colour says who, lines say what: the team brings the colour, and the only sport colour is the
// basketball's own orange (docs/brand.md). A new sport in config.ts brings all of it here; the
// order here is the order sports are listed in.
export const WORDS: Record<Sport, { start: string; starts: string; ground: string; ball: string; surface: string }> = {
  football: {
    start: 'kickoff',
    starts: 'kicks off',
    ground: 'stadium',
    // Dark pentagons (the centre one and the five cut by the rim) alternating with light hexagons;
    // the seams are thinner than the outline so the hexagons stay open at 18 px.
    ball: icon('<circle cx="12" cy="12" r="9"/><path d="M12 8.2L15.61 10.83L14.23 15.07L9.77 15.07L8.39 10.83zM12 5.8L8.34 3.78A9 9 0 0 1 15.66 3.78zM17.9 10.08L18.69 5.98A9 9 0 0 1 20.95 12.94zM15.64 17.02L19.79 16.5A9 9 0 0 1 13.87 20.8zM8.36 17.02L10.13 20.8A9 9 0 0 1 4.21 16.5zM6.1 10.08L3.05 12.94A9 9 0 0 1 5.31 5.98z" fill="currentColor" stroke="none"/><path d="M12 8.2V5.8M15.61 10.83L17.9 10.08M14.23 15.07L15.64 17.02M9.77 15.07L8.36 17.02M8.39 10.83L6.1 10.08M8.34 3.78L12 5.8L15.66 3.78M18.69 5.98L17.9 10.08L20.95 12.94M19.79 16.5L15.64 17.02L13.87 20.8M10.13 20.8L8.36 17.02L4.21 16.5M3.05 12.94L6.1 10.08L5.31 5.98" stroke-width="1.4"/>'),
    surface: drawing('<rect x="10" y="10" width="280" height="170" rx="2"/><path d="M150 10v170"/><circle cx="150" cy="95" r="26"/><rect x="10" y="50" width="46" height="90"/><rect x="10" y="72" width="16" height="46"/><path d="M56 74.5A26 26 0 0 1 56 115.5"/><rect x="244" y="50" width="46" height="90"/><rect x="274" y="72" width="16" height="46"/><path d="M244 74.5A26 26 0 0 0 244 115.5"/><rect x="4" y="84" width="6" height="22"/><rect x="290" y="84" width="6" height="22"/>'),
  },
  basketball: {
    start: 'tip-off',
    starts: 'tips off',
    ground: 'arena',
    ball: icon('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5.64 5.64C9 9 9 15 5.64 18.36M18.36 5.64C15 9 15 15 18.36 18.36"/>', '#D9600F'),
    surface: drawing('<rect x="10" y="10" width="280" height="170" rx="2"/><path d="M150 10v170"/><circle cx="150" cy="95" r="18"/><rect x="10" y="70" width="58" height="50"/><path d="M68 77A18 18 0 0 1 68 113"/><path d="M10 24H44A74.3 74.3 0 0 1 44 166H10"/><circle cx="22" cy="95" r="4"/><path d="M16 87v16"/><rect x="232" y="70" width="58" height="50"/><path d="M232 77A18 18 0 0 0 232 113"/><path d="M290 24H256A74.3 74.3 0 0 0 256 166H290"/><circle cx="278" cy="95" r="4"/><path d="M284 87v16"/>'),
  },
}
export const SPORTS = Object.keys(WORDS) as Sport[]

// The reminder a timed game carries in its feed (ics.ts) and shows in its How it works step: an
// hour before the start, the game and the channels. The channel names are enough there; the
// "(Greek TV)" hint stays in the event's description.
export const REMINDER_HOURS = 1
export const reminder = (game: Game, sport: Sport) => ({
  text: `${game.home} vs ${game.away} ${WORDS[sport].starts} in an hour`,
  tv: game.tv?.replace(/\s*\(.*\)$/, ''),
})

// siteUrl is the public address of the site; without it (local builds) the subscribe links are
// relative and the ones that need a public address (Google, Outlook, the paste field) are left out.
export function renderTeamPage(section: Section, all: Team[], siteUrl?: string): string {
  const { team, games } = section
  const from = federation(team)
  const { start, ground, ball } = WORDS[team.sport]
  const next = games[0]
  return page({
    root: '../../',
    title: `${team.name} · ${siteName}`,
    description: `Every game of the ${team.side} in your calendar: ${start}, venue, TV and tickets, updated daily.`,
    // The share image sits next to the page; chat apps need both addresses absolute, so a local
    // build (no public address) leaves them out rather than printing relative ones.
    share: { url: siteUrl && `${siteUrl}/${team.country}/${team.sport}/`, image: siteUrl && `${siteUrl}/${sharePath(team)}` },
    stripes: team.colours,
    body: `<div class="band"></div>
${header('../../', '<a class="pill pill-primary" href="#subscribe">Add to my calendar</a>')}
${countryBar(team, all)}
<main>
<section class="wrap hero">
  <div class="hero-text">
    <p class="sport-tag">${ball}<span>${capitalise(`men's ${team.sport}`)} · ${from}</span></p>
    <h1>${esc(team.name)}, in your calendar.</h1>
    <p class="lede">Every ${start}, ${ground}, channel and ticket sale for the national team — kept current in the calendar you already use, with a nudge an hour before we play. Nothing to install.</p>
${subscribePanel(team, siteUrl)}
  </div>
${nextGameCard(team, next)}
</section>
<section class="games" id="games">
  <div class="wrap">
    <div class="section-head">
      <h2>Upcoming games</h2>
      ${games.length ? `<p class="aside">${inTheFeed(games.length)}</p>` : ''}
    </div>
    ${games.length ? `<ul class="rows">\n${games.map((game) => renderRow(game, start)).join('\n')}\n</ul>` : '<p>No games announced yet.</p>'}
    <p class="small">New games and ${start} times appear a day or two after ${from} announces them.${games.some((game) => game.tv) ? ' TV channels are the expected broadcasters — we update them closer to the game.' : ''}</p>
  </div>
</section>
<section class="teams" id="teams">
  <div class="wrap">
    <div class="teams-text">
      <h2>Other teams</h2>
      <p>Each team is its own feed, in its own colours. Add as many as you follow — national sides today, your club next.</p>
${FINDER}
    </div>
${teamChips(all, team)}
  </div>
</section>
</main>
${footer()}`,
    script: COPY_SCRIPT + ALERTS_SCRIPT + FIND_SCRIPT,
  })
}

export function renderLanding(sections: Section[], siteUrl?: string): string {
  const countries = byCountry(sections, ({ team }) => team)
  return page({
    root: '',
    title: `${siteName} · Your colours, in your calendar`,
    description: 'Every game of the national teams we follow in your calendar: kickoff or tip-off, venue, TV and tickets, updated daily.',
    // The landing page's share image sits at the site root, next to it.
    share: { url: siteUrl && `${siteUrl}/`, image: siteUrl && `${siteUrl}/${landingSharePath}` },
    body: `${header('', '')}
<main>
<section class="wrap hero">
  <div class="hero-text">
    <h1>Your colours, in your calendar.</h1>
    <p class="lede">Pick your team and subscribe once. Every kickoff or tip-off, venue, channel and ticket sale lands in the calendar you already use, with a nudge an hour before the game. Nothing to install.</p>
${FINDER}
    <nav class="chips" aria-label="Countries">
${countries.map((group) => countryChip(group[0]!.team, '', `#${group[0]!.team.country}`)).join('\n')}
    </nav>
  </div>
</section>
<section class="wrap countries" aria-label="Teams by country">
${countries.map((group) => countryCard(group)).join('\n')}
</section>
</main>
${footer()}`,
    script: FIND_SCRIPT,
  })
}

// A country's page at /{country}/: its teams on the same card as on the landing, under the
// country's stripes. Room for its clubs later, so the landing keeps one card per country.
export function renderCountryPage(group: Section[], siteUrl?: string): string {
  const { team } = group[0]!
  const name = esc(countryName(team))
  // "kickoff or tip-off", or only the words of the sports the country has a team in.
  const starts = SPORTS.filter((sport) => group.some((section) => section.team.sport === sport))
    .map((sport) => WORDS[sport].start)
    .join(' or ')
  return page({
    root: '../',
    title: `${countryName(team)} · ${siteName}`,
    description: `Every ${countryName(team)} game in your calendar: ${starts}, venue, TV and tickets, updated daily.`,
    share: { url: siteUrl && `${siteUrl}/${team.country}/`, image: siteUrl && `${siteUrl}/${countrySharePath(team)}` },
    stripes: team.colours,
    body: `<div class="band"></div>
${header('../', '')}
<main>
<section class="wrap hero">
  <div class="hero-text">
    <h1>${name}, in your calendar.</h1>
    <p class="lede">Pick a team and subscribe once. Every ${starts}, venue, channel and ticket sale lands in the calendar you already use, with a nudge an hour before we play. Nothing to install.</p>
  </div>
</section>
<section class="wrap countries" aria-label="${name} teams">
${countryCard(group, '../', true)}
</section>
</main>
${footer()}`,
  })
}

// How it works at /how-it-works/: one page for every team, linked from every top bar, so its steps
// name both sports' starts. Each step sits over a picture of what the fan gets: the button, a game's
// event replacing its placeholder, and its reminder. The pictures show the soonest game with a
// time, in its own sport's words and its team's colours; until a game has a time, there are none.
export function renderHowItWorks(sections: Section[], siteUrl?: string): string {
  const teams = sections.map(({ team }) => team)
  const soonest = sections
    .flatMap(({ team, games }) => games.filter((game) => game.kickoff).map((game) => ({ team, game })))
    .sort((a, b) => Date.parse(a.game.kickoff!) - Date.parse(b.game.kickoff!))[0]
  let scenes = ['', '', '']
  if (soonest) {
    const { team, game } = soonest
    const alarm = reminder(game, team.sport)
    // When the reminder goes off, read like a kickoff: at the venue's clock, with its city.
    const alarmAt = kickoffText({ ...game, kickoff: new Date(Date.parse(game.kickoff!) - REMINDER_HOURS * 60 * 60 * 1000).toISOString() }, shortDate)
    scenes = [
      `<div class="scene"><a class="btn-primary" href="../">Pick your team</a></div>`,
      `<div class="scene" aria-hidden="true"><span class="cal-old">${matchTitle(game)} · time not announced</span><span class="cal-event" style="${stripeVars(team.colours)}"><b>${matchTitle(game)}</b><span>${esc(kickoffText(game, shortDate, WORDS[team.sport].start))}</span><span>${esc(place(game))}</span></span></div>`,
      `<div class="scene" aria-hidden="true"><span class="nudge"><span class="nudge-time">${ICON.date}${esc(alarmAt)}</span><b>${esc(alarm.text)}</b>${alarm.tv ? `<span>${esc(alarm.tv)}</span>` : ''}</span></div>`,
    ]
  }
  const step = (n: number, body: string) => `    <li class="step">${scenes[n - 1]}<div class="step-body"><span class="step-num">${n}</span>${body}</div></li>`
  return page({
    root: '../',
    title: `How it works · ${siteName}`,
    description: 'Subscribe once and every kickoff or tip-off, venue, TV channel and ticket sale lands in your calendar, updated daily.',
    share: { url: siteUrl && `${siteUrl}/how-it-works/`, image: siteUrl && `${siteUrl}/${landingSharePath}` },
    body: `${header('../')}
<main>
<section class="wrap hero">
  <div class="hero-text">
    <h1>How it works</h1>
    <p class="lede">Subscribe once and every kickoff or tip-off, venue, channel and ticket sale lands in the calendar you already use, kept current every day. Nothing to install.</p>
  </div>
</section>
<section class="wrap how">
  <ol class="steps">
${step(1, '<h3>Subscribe once</h3><p>Pick your team, tap Add to my calendar and pick your app. That is the whole setup: no account, no download.</p>')}
${step(2, `<h3>Your calendar keeps itself current</h3><p>We rebuild the feeds every day from ${federations(teams)}. New games, times and venues land in place, in your time zone.</p>`)}
${step(3, '<h3>A nudge an hour before the game</h3><p>The channel and the ticket link are inside the event, so nobody goes hunting for them as the teams walk out.</p><p>On Google Calendar, set a notification for this calendar once. It applies to every game.</p>')}
  </ol>
</section>
<section class="teams">
  <div class="wrap">
    <div class="teams-text">
      <h2>Pick your team</h2>
      <p>Each team is its own feed, in its own colours. Add as many as you follow.</p>
${FINDER}
    </div>
    <nav class="chips" aria-label="Countries">
${byCountry(teams, (team) => team).map((group) => countryChip(group[0]!, '../', `../#${group[0]!.country}`)).join('\n')}
    </nav>
  </div>
</section>
</main>
${footer()}`,
    script: FIND_SCRIPT,
  })
}

// The identity kit at /kit/: every country and sport, drawn by the same helpers as the real pages,
// so a clashing stripe, a missing flag or a missing sport mark shows here first. Unlisted and kept
// out of search engines: it is a test page for us, not for fans.
export function renderKit(all: Team[]): string {
  const countries = byCountry(all.map((team): Section => ({ team, games: [] })), ({ team }) => team)
  const sport = (name: Sport) => {
    const { ball, surface, start, starts, ground } = WORDS[name]
    return `  <div class="card">
    <div class="card-surface">${surface}</div>
    <div class="card-body">
      <p class="cell-sport">${ball}${capitalise(name)}</p>
      <dl class="kit-words"><dt>Start</dt><dd>${start}</dd><dt>Verb</dt><dd>${starts}</dd><dt>Ground</dt><dd>${ground}</dd><dt>Source</dt><dd>${federations(all.filter((team) => team.sport === name))}</dd></dl>
    </div>
  </div>`
  }
  const team = ({ team }: Section) => `  <div class="kit-team" style="${stripeVars(team.colours)}">
    <p class="small">${esc(team.name)} · <span class="num">${team.colours.join(' · ')}</span></p>
${nextGameCard(team)}
  </div>`
  return page({
    root: '../',
    title: `Identity kit · ${siteName}`,
    description: 'Every team and sport on scarf, side by side.',
    noindex: true,
    body: `${header('../', '')}
<main>
<section class="wrap hero">
  <div class="hero-text">
    <h1>Identity kit</h1>
    <p class="lede">Colour says who, lines say what. A country is its flag, its name and its stripes. A sport never takes a team colour: it is a ball, a drawing of the pitch or court, and its own words. The one exception is the basketball's own orange. Everything here comes from the team list and the code behind the real pages, so a clashing stripe, a missing flag or a missing sport mark shows here first.</p>
  </div>
</section>
<section class="wrap kit" aria-labelledby="kit-countries">
  <h2 id="kit-countries">Countries</h2>
  <nav class="chips" aria-label="Countries">
${countries.map((group) => countryChip(group[0]!.team, '../', `#${group[0]!.team.country}`)).join('\n')}
  </nav>
${countries.map((group) => countryCard(group, '../')).join('\n')}
</section>
<section class="wrap kit" aria-labelledby="kit-sports">
  <h2 id="kit-sports">Sports</h2>
  <div class="kit-grid">
${SPORTS.map(sport).join('\n')}
  </div>
</section>
<section class="wrap kit" aria-labelledby="kit-teams">
  <h2 id="kit-teams">Teams</h2>
  <div class="kit-grid">
${countries.flatMap((group) => SPORTS.flatMap((sport) => group.filter((section) => section.team.sport === sport))).map(team).join('\n')}
  </div>
</section>
</main>
${footer()}`,
  })
}

function page(p: {
  root: string
  title: string
  description: string
  body: string
  share?: { url?: string; image?: string }
  stripes?: string[]
  script?: string
  noindex?: boolean
}): string {
  // The latin font files every page uses are preloaded: found only after site.css, they would arrive
  // after the first paint, even on a repeat view, where every file is revalidated.
  // shortcut: latin-ext letters (Š, ć) still swap in a moment after the first paint; a long cache
  // lifetime for fonts/ would fix that, if it ever shows.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
${p.noindex ? '<meta name="robots" content="noindex">\n' : ''}${socialMeta(p)}<link rel="icon" href="${p.root}favicon.svg" type="image/svg+xml">
<link rel="icon" href="${p.root}icon-512.png" type="image/png" sizes="512x512">
<link rel="apple-touch-icon" href="${p.root}apple-touch-icon.png">
<link rel="preload" href="${p.root}fonts/BricolageGrotesque-latin.woff2" as="font" crossorigin>
<link rel="preload" href="${p.root}fonts/AlbertSans-latin.woff2" as="font" crossorigin>
<link rel="stylesheet" href="${p.root}brand-tokens.css">
<link rel="stylesheet" href="${p.root}site.css">
</head>
<body${p.stripes ? ` style="${stripeVars(p.stripes)}"` : ''}>
${p.body}
<script>
  for (const el of document.querySelectorAll('time[data-offset]')) {
    const kickoff = new Date(el.dateTime)
    if (-kickoff.getTimezoneOffset() / 60 === Number(el.dataset.offset)) continue
    const yours = document.createElement('span')
    yours.className = 'yours'
    yours.textContent = '· ' + kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' your time'
    el.after(' ', yours)
  }${p.script ?? ''}
</script>
</body>
</html>
`
}

// What a chat app shows when a fan pastes the page's address: the title, the description and the
// 1200×630 share card the build renders next to the page.
function socialMeta(p: { title: string; description: string; share?: { url?: string; image?: string } }): string {
  const tags = [
    ['og:title', p.title],
    ['og:description', p.description],
    ['og:url', p.share?.url],
    ['og:image', p.share?.image],
    ['og:image:width', p.share?.image && String(shareSize.width)],
    ['og:image:height', p.share?.image && String(shareSize.height)],
    ['twitter:card', p.share && 'summary_large_image'],
  ]
  // Open Graph tags go by "property", Twitter's by "name".
  return tags
    .filter(([, content]) => content)
    .map(([key, content]) => `<meta ${key!.startsWith('twitter:') ? 'name' : 'property'}="${key}" content="${esc(content!)}">\n`)
    .join('')
}

const COPY_SCRIPT = `
  for (const button of document.querySelectorAll('button[data-copy]')) {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.copy)
      input.select() // stays selected for a manual copy if the browser refuses the clipboard
      navigator.clipboard?.writeText(input.value).then(() => { button.textContent = 'Copied' }, () => {})
    })
  }`

// Picking "Games and announcements" points every subscribe link and the paste field at the -alerts
// feed. Without JavaScript the choice stays hidden and the default links stand (a noscript line
// links the variant).
const ALERTS_SCRIPT = `
  const alertsToggle = document.getElementById('alerts-toggle')
  if (alertsToggle) {
    const choice = alertsToggle.closest('fieldset')
    const targets = [...document.querySelectorAll('[data-alerts]')]
    for (const el of targets) el.dataset.feed = el.tagName === 'INPUT' ? el.value : el.getAttribute('href')
    const apply = () => {
      for (const el of targets) {
        const address = alertsToggle.checked ? el.dataset.alerts : el.dataset.feed
        if (el.tagName === 'INPUT') el.value = address
        else el.setAttribute('href', address)
      }
      for (const button of document.querySelectorAll('button[data-copy]')) button.textContent = 'Copy'
    }
    choice.addEventListener('change', apply)
    apply()
    choice.hidden = false
  }`

// A field over a long list of countries (fifty-odd chips, and the landing's cards): typing keeps
// only the countries whose name holds what was typed, accents aside. A chip's name is its text, a
// card's its heading. Without JavaScript it stays hidden and every country stays listed.
const FINDER = `      <div class="find" hidden><label for="find">Find your country</label><input id="find" type="search" autocomplete="off" spellcheck="false"><p class="small" role="status" id="find-status"></p></div>`
const FIND_SCRIPT = `
  const findField = document.getElementById('find')
  if (findField) {
    const fold = (text) => text.normalize('NFD').replace(/\\p{M}/gu, '').toLowerCase()
    const named = [...document.querySelectorAll('.country-chip, article.country')].map((el) => [el, fold((el.querySelector('h2') ?? el).textContent)])
    const status = document.getElementById('find-status')
    const apply = () => {
      const query = fold(findField.value.trim())
      const shown = new Set()
      for (const [el, name] of named) {
        el.hidden = !name.includes(query)
        if (!el.hidden) shown.add(name)
      }
      status.textContent = !query ? '' : shown.size === 0 ? 'Not on scarf yet' : shown.size === 1 ? '1 country' : shown.size + ' countries'
    }
    findField.addEventListener('input', apply)
    apply()
    findField.parentElement.hidden = false
  }`

// Every page's top bar: the logo goes home and How it works is one page for every team. A team
// page adds its subscribe button.
function header(root: string, nav = ''): string {
  return `<header class="wrap site-header">
  <a class="brand" href="${root || './'}">${mark(38)}<span class="wordmark">${siteName}</span></a>
  <nav class="site-nav" aria-label="Site"><a class="pill" href="${root}how-it-works/">How it works</a>${nav}</nav>
</header>`
}

// GitHub's mark (Octicons mark-github), filled in the text colour, so the link says where it goes.
const GITHUB_MARK = `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg>`

// Every page's footer: the motto, and where a fan reports a wrong kickoff or asks for a team.
function footer(): string {
  return `<footer class="wrap site-footer">
  <div class="footer-brand">${mark(28)}<span class="wordmark">${siteName}</span><span>· Wrapped up in the game.</span></div>
  <a class="footer-link" href="https://github.com/topless/scarf/issues/new/choose">${GITHUB_MARK}Suggest a team or report a bug</a>
</footer>`
}

const ALERTS_LABEL = 'Games and announcements'
const ALERTS_NOTE = 'The same games, plus an all-day “New game” entry on the day each one is announced.'

function subscribePanel(team: Team, siteUrl?: string): string {
  const feed = feedLinks(team, false, siteUrl)
  const alerts = feedLinks(team, true, siteUrl)
  // Every link carries the -alerts address as well; ALERTS_SCRIPT swaps them when the box is ticked.
  const link = (cls: string, href: string, alt: string, text: string) =>
    `<a class="${cls}" href="${esc(href)}" data-alerts="${esc(alt)}">${text}</a>`
  const secondary =
    feed.apps && alerts.apps
      ? `${link('btn-secondary', feed.webcal, alerts.webcal, 'Apple')}
      ${link('btn-secondary', feed.apps.google, alerts.apps.google, 'Google')}
      ${link('btn-secondary', feed.apps.outlook, alerts.apps.outlook, 'Outlook')}`
      : link('btn-secondary', feed.webcal, alerts.webcal, 'Calendar file')
  // The choice comes before the buttons, so a fan picks a calendar before adding it.
  return `    <div class="subscribe" id="subscribe">
      <fieldset class="feed-choice" hidden><legend>Pick your calendar</legend>
        <label><input type="radio" name="feed-choice" checked autocomplete="off"><span>Games<span class="small">Every game, with a nudge an hour before.</span></span></label>
        <label><input type="radio" name="feed-choice" id="alerts-toggle" autocomplete="off"><span>${ALERTS_LABEL}<span class="small">${ALERTS_NOTE}</span></span></label>
      </fieldset>
      ${link('btn-primary', feed.webcal, alerts.webcal, 'Add to my calendar')}
      <div class="apps">
      ${secondary}
      </div>
      <noscript><p class="small">Want a “New game” entry on the day each game is announced too? <a href="${esc(alerts.webcal)}">Add games and announcements</a> instead.</p></noscript>
${
  feed.https && alerts.https
    ? `      <div class="paste">
        <label for="feed-url">Or paste into any calendar app</label>
        <div class="paste-row"><input id="feed-url" type="text" readonly value="${esc(feed.https)}" data-alerts="${esc(alerts.https)}"><button class="btn-secondary" type="button" data-copy="feed-url">Copy</button></div>
      </div>
`
    : ''
}      <p class="small">Free. Updated daily from ${federation(team)}. Leave any time by deleting the calendar. ${GOOGLE_NOTE}</p>
    </div>`
}

// The addresses of one feed, default or -alerts. The page sits at /{country}/{sport}/ and the
// feeds next to that folder, so without a public address the link is relative and the app links,
// which need one, are left out.
function feedLinks(team: Team, alerts: boolean, siteUrl?: string): { webcal: string; https?: string; apps?: { google: string; outlook: string } } {
  const path = alerts ? alertsFeedPath(team) : feedPath(team)
  if (!siteUrl) return { webcal: path.replace(/^.*\//, '../') }
  const https = `${siteUrl}/${path}`
  const webcal = https.replace(/^https?:/, 'webcal:')
  return {
    webcal,
    https,
    apps: {
      google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`,
      outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(https)}&name=${encodeURIComponent(feedName(team, alerts))}`,
    },
  }
}

// The country under the header, with a switch to its other sports when it has more than one.
function countryBar(team: Team, all: Team[]): string {
  const name = esc(countryName(team))
  const sports = SPORTS.flatMap((sport) => all.filter((other) => other.country === team.country && other.sport === sport))
  const link = (other: Team) =>
    `<a href="../../${other.country}/${other.sport}/"${other === team ? ' aria-current="page"' : ''}>${WORDS[other.sport].ball}${capitalise(other.sport)}</a>`
  return `<div class="wrap">
  <div class="country-bar">
    <a class="country-name" href="../"><img class="flag" src="../../${flagPath(team.flag)}" width="32" height="24" alt="">${name}</a>
    ${sports.length > 1 ? `<nav class="switch" aria-label="${name} teams">${sports.map(link).join('')}</nav>` : ''}
  </div>
</div>`
}

function nextGameCard(team: Team, game?: Game): string {
  const { start, surface } = WORDS[team.sport]
  if (!game) {
    return `  <div class="card">
    <div class="card-stripe"></div>
    <div class="card-surface">${surface}</div>
    <div class="card-body">
      <p class="card-meta"><span>Next game</span></p>
      <p class="card-title">No games announced yet.</p>
      <p class="card-foot">Subscribe now and new games land in your calendar as soon as ${federation(team)} announces them.</p>
    </div>
  </div>`
  }
  return `  <div class="card">
    <div class="card-stripe"></div>
    <div class="card-surface">${surface}</div>
    <div class="card-body">
      <p class="card-meta"><span>Next game</span><span>${esc(game.competition)}</span></p>
      <p class="card-title">${matchTitle(game)}</p>
      <ul class="facts">
        <li>${ICON.date}<span class="num">${when(game, longDate, start)}</span></li>
        <li>${ICON.place}<span>${esc(place(game))}</span></li>
        ${game.tv ? `<li>${ICON.tv}<span>${esc(game.tv)}</span></li>` : ''}
        ${game.tickets ? `<li>${ICON.ticket}<a href="${esc(game.tickets)}">Tickets</a></li>` : ''}
        ${game.note ? `<li><span>${esc(game.note)}</span></li>` : ''}
      </ul>
      <p class="card-foot">In your calendar it shows in your own time zone. We nudge you an hour before ${start}.</p>
    </div>
  </div>`
}

function renderRow(game: Game, start: string): string {
  const day = new Date(game.kickoff && game.utcOffsetHours !== undefined ? shift(game) : game.kickoff ?? game.date)
  const meta = [game.competition, place(game), game.tv].filter(Boolean).map((s) => esc(s!)).join(' · ')
  return `<li class="row">
  <div class="row-date"><span class="row-day">${DAY_MONTH.format(day)}</span><span class="row-time num">${when(game, WEEKDAY.format, start)}</span></div>
  <div class="row-main"><span class="row-title">${matchTitle(game)}</span><span class="row-meta">${meta}</span>${game.note ? `<span class="row-meta">${esc(game.note)}</span>` : ''}</div>
  ${game.tickets ? `<a class="row-tickets" href="${esc(game.tickets)}">Tickets</a>` : ''}
</li>`
}

// One chip per country, the same chips as on the landing. Each opens that country in the sport
// of this page, or in its other sport when it has no team in this one.
function teamChips(all: Team[], current: Team): string {
  const chip = (group: Team[]) => {
    const team = group.find((other) => other.sport === current.sport) ?? group[0]!
    return countryChip(team, '../../', `../../${team.country}/${team.sport}/`, team === current)
  }
  return `    <div class="chips">
${byCountry(all, (team) => team).map(chip).join('\n')}
    </div>`
}

// A country's flag and name. root is the way from the page to the site root, for the flag.
function countryChip(team: Team, root: string, href: string, current = false): string {
  return `      <a class="country-chip" href="${href}"${current ? ' aria-current="page"' : ''}><img class="flag" src="${root}${flagPath(team.flag)}" width="20" height="15" alt="">${esc(countryName(team))}</a>`
}

// A country's card on the landing page: its stripes, flag and name, then one cell per sport. The
// country's teams share their stripes (they come from the flag), so the first team's stand for all.
// root is the way from the page to the site root, for the flag and the team links. The flag and
// name link to the country's page, except on that page itself (current).
function countryCard(group: Section[], root = '', current = false): string {
  const { team } = group[0]!
  const heading = `<img class="flag" src="${root}${flagPath(team.flag)}" width="44" height="33" alt=""><h2 id="c-${team.country}">${esc(countryName(team))}</h2>`
  return `  <article class="card country" id="${team.country}" aria-labelledby="c-${team.country}" style="${stripeVars(team.colours)}">
    <div class="card-stripe"></div>
    <div class="country-body">
      ${current ? `<div class="country-name">${heading}</div>` : `<a class="country-name" href="${root}${team.country}/">${heading}${ICON.arrow}</a>`}
${SPORTS.map((sport) => sportCell(sport, group.find((section) => section.team.sport === sport), root)).join('\n')}
    </div>
  </article>`
}

// One sport of a country: its next game and a link to the team page, or a placeholder when the
// country has no team in that sport.
function sportCell(sport: Sport, section?: Section, root = ''): string {
  const { ball, start } = WORDS[sport]
  if (!section) {
    return `      <div class="cell cell-empty"><span class="cell-sport">${ball}${capitalise(sport)}</span><span>Not on scarf yet</span></div>`
  }
  const { team, games } = section
  const next = games[0]
  return `      <a class="cell" href="${root}${team.country}/${team.sport}/">
        <span class="cell-sport">${ball}${capitalise(sport)}<small>${federation(team)}</small></span>
        <span class="cell-next">${next ? `<b>${matchTitle(next)}</b><span class="num">${when(next, shortDate, start)}</span>` : '<span>No games announced yet.</span>'}</span>
        <span class="cell-cta">Games and subscribe${ICON.arrow}</span>
      </a>`
}

const matchTitle = (game: Game) => `${esc(game.home)} vs ${esc(game.away)}`
const place = (game: Game) => [game.venue, game.city].filter(Boolean).join(', ') || 'Venue not announced'
export const federation = (team: Team) => team.source.kind.toUpperCase()
// "UEFA and FIBA", "football, basketball and handball".
const and = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)
// "UEFA and FIBA": every source behind a list of teams, once each, in the teams' order.
export const federations = (teams: Team[]) => and([...new Set(teams.map(federation))])
export const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
// "National team · Men's football": the eyebrow over a team's name on its share image.
export const teamKind = (team: Team) => `National team · ${capitalise(`men's ${team.sport}`)}`
// "National teams · Football and basketball": the same over the landing page's share image.
export const landingKind = (teams: Team[]) => `National teams · ${capitalise(and([...new Set(teams.map((team) => team.sport))]))}`

// "Greece" from "Greece football".
// shortcut: assumes every team name is "{Country} {sport}", as config.ts names them; give Team a
// country name of its own when a team is named otherwise.
export const countryName = (team: Team) => team.name.slice(0, -team.sport.length - 1)

// Items grouped by country, the countries in alphabetical order of their names.
function byCountry<T>(items: T[], teamOf: (item: T) => Team): T[][] {
  const countries = [...new Set(items.map((item) => teamOf(item).country))]
  return countries
    .map((country) => items.filter((item) => teamOf(item).country === country))
    .sort((a, b) => countryName(teamOf(a[0]!)).localeCompare(countryName(teamOf(b[0]!))))
}

// The kickoff as a clock at the venue reads it.
const shift = (game: Game) => new Date(new Date(game.kickoff!).getTime() + game.utcOffsetHours! * 60 * 60 * 1000)

// Venue time with the city, so "20:45 in Amsterdam" cannot be mistaken for the reader's own time.
// The caller picks how the date part reads, and may name the sport's start before the clock
// ("Kickoff 20:45 in Amsterdam"); the time part is the clock at the venue with its city, the UTC
// time when the venue's offset is unknown, or "time not announced".
export function kickoffText(game: Game, date: (d: Date) => string, start?: string): string {
  if (!game.kickoff) return `${date(new Date(game.date))} · time not announced`
  const label = start ? `${capitalise(start)} ` : ''
  const kickoff = new Date(game.kickoff)
  if (game.utcOffsetHours === undefined) return `${date(kickoff)} · ${label}${TIME.format(kickoff)} UTC`
  const local = shift(game)
  return `${date(local)} · ${label}${TIME.format(local)} ${game.city ? `in ${game.city}` : 'at the venue'}`
}

// Same, marked up so the page's script can add the reader's own time when their zone differs.
function when(game: Game, date: (d: Date) => string, start: string): string {
  const text = esc(kickoffText(game, date, start))
  if (!game.kickoff) return text
  const offset = game.utcOffsetHours === undefined ? '' : ` data-offset="${game.utcOffsetHours}"`
  return `<time datetime="${esc(game.kickoff)}"${offset}>${text}</time>`
}

// Hard-stop stripes per docs/brand.md: one repeat is a fixed length shared by the colours, so a
// card header gives two colours 18 px each and three 12 px. Stops round to whole pixels.
export function stripes(colours: string[], repeat: number): string {
  const stop = (i: number) => `${Math.round((i * repeat) / colours.length)}px`
  return `repeating-linear-gradient(90deg, ${colours.map((c, i) => `${c} ${stop(i)} ${stop(i + 1)}`).join(', ')})`
}

// The card header and the page band.
const stripeVars = (colours: string[]) => `--stripe: ${stripes(colours, 36)}; --stripe-wide: ${stripes(colours, 48)}`

function inTheFeed(count: number): string {
  if (count === 1) return 'Already in the feed'
  if (count === 2) return 'Both are already in the feed'
  return `All ${count} are already in the feed`
}

// The brand mark's drawing, from its one copy in assets/; share.ts draws it on the cards too.
export const markDrawing = readFileSync(new URL('../assets/scarf-mark.svg', import.meta.url), 'utf8').match(/<g.*<\/g>/s)![0]

const mark = (size: number) => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" aria-hidden="true">${markDrawing}</svg>`

const ICON = {
  arrow: icon('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  date: icon('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  place: icon('<path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>'),
  tv: icon('<rect x="2" y="7" width="20" height="13" rx="2"/><path d="M8 3l4 4 4-4"/>'),
  ticket: icon('<path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4V7z"/><path d="M10 7v10" stroke-dasharray="2 2"/>'),
}

export function esc(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
