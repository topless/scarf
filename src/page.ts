import { feedPath, landingSharePath, sharePath, shareSize, siteName, type Team } from './config.ts'
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

// siteUrl is the public address of the site; without it (local builds) the subscribe links are
// relative and the ones that need a public address (Google, Outlook, the paste field) are left out.
export function renderTeamPage(section: Section, all: Team[], siteUrl?: string): string {
  const { team, games } = section
  const from = federation(team)
  const next = games[0]
  return page({
    root: '../../',
    title: `${team.name} · ${siteName}`,
    description: `Every game of the ${team.side} in your calendar: kickoff, venue, TV and tickets, updated daily.`,
    // The share image sits next to the page; chat apps need both addresses absolute, so a local
    // build (no public address) leaves them out rather than printing relative ones.
    share: { url: siteUrl && `${siteUrl}/${team.country}/${team.sport}/`, image: siteUrl && `${siteUrl}/${sharePath(team)}` },
    stripes: team.colours,
    body: `<div class="band"></div>
${header('../../', `<nav class="site-nav" aria-label="Page">
  <a class="pill" href="#teams">Teams</a>
  <a class="pill" href="#how">How it works</a>
  <a class="pill pill-primary" href="#subscribe">Add to my calendar</a>
</nav>`)}
<main>
<section class="wrap hero">
  <div class="hero-text">
    <p class="eyebrow"><img src="../../${flagPath(team.flag)}" width="24" height="18" alt=""><span>${esc(teamKind(team))}</span></p>
    <h1>${esc(team.name)}, in your calendar.</h1>
    <p class="lede">Every kickoff, stadium, channel and ticket sale for the national team — kept current in the calendar you already use, with a nudge an hour before we play. Nothing to install.</p>
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
    ${games.length ? `<ul class="rows">\n${games.map(renderRow).join('\n')}\n</ul>` : '<p>No games announced yet.</p>'}
    <p class="small">New games and kickoff times appear a day or two after ${from} announces them. TV channels are the expected broadcasters — we update them closer to the game.</p>
  </div>
</section>
<section class="wrap how" id="how">
  <h2>How it works</h2>
  <ol class="steps">
    <li class="step"><span class="step-num">1</span><h3>Subscribe once</h3><p>Tap Add to my calendar and pick your app. That is the whole setup — no account, no download.</p></li>
    <li class="step"><span class="step-num">2</span><h3>Your calendar keeps itself current</h3><p>We rebuild the feed every day from ${from}. New games, kickoff times and venues appear on their own, in your time zone.</p></li>
    <li class="step"><span class="step-num">3</span><h3>A nudge an hour before kickoff</h3><p>Channel and ticket link live inside the event, so nobody is hunting for them at 20:40.</p></li>
  </ol>
</section>
<section class="teams" id="teams">
  <div class="wrap">
    <div class="teams-text">
      <h2>Other teams</h2>
      <p>Each team is its own feed, in its own colours. Add as many as you follow — national sides today, your club next.</p>
    </div>
    <div class="chips">
${all.map((other) => teamChip(other, other === team)).join('\n')}
    </div>
  </div>
</section>
</main>
${footer()}`,
    script: COPY_SCRIPT,
  })
}

export function renderLanding(sections: Section[], siteUrl?: string): string {
  return page({
    root: '',
    title: `${siteName} · Your colours, in your calendar`,
    description: 'Every game of the national teams we follow in your calendar: kickoff, venue, TV and tickets, updated daily.',
    // The landing page's share image sits at the site root, next to it.
    share: { url: siteUrl && `${siteUrl}/`, image: siteUrl && `${siteUrl}/${landingSharePath}` },
    body: `${header('', '')}
<main>
<section class="wrap hero">
  <div class="hero-text">
    <h1>Your colours, in your calendar.</h1>
    <p class="lede">Pick your team and subscribe once. Every kickoff, stadium, channel and ticket sale lands in the calendar you already use, with a nudge an hour before kickoff. Nothing to install.</p>
  </div>
</section>
<section class="wrap team-cards" aria-label="Teams">
${sections.map(teamCard).join('\n')}
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
}): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
${socialMeta(p)}<link rel="icon" href="${p.root}favicon.svg" type="image/svg+xml">
<link rel="icon" href="${p.root}icon-512.png" type="image/png" sizes="512x512">
<link rel="apple-touch-icon" href="${p.root}apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500;600;700&amp;family=Bricolage+Grotesque:opsz,wght@12..96,300..800&amp;display=swap">
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

function header(root: string, nav: string): string {
  return `<header class="wrap site-header">
  <a class="brand" href="${root || './'}">${mark(38)}<span class="wordmark">${siteName}</span></a>
  ${nav}
</header>`
}

function footer(): string {
  return `<footer class="wrap site-footer">
  <div class="footer-brand">${mark(28)}<span class="wordmark">${siteName}</span><span>· Wrapped up in the game.</span></div>
</footer>`
}

function subscribePanel(team: Team, siteUrl?: string): string {
  const https = siteUrl ? `${siteUrl}/${feedPath(team)}` : undefined
  // The page sits at /{country}/{sport}/, the feed next to that folder at /{country}/{sport}.ics.
  const webcal = https ? https.replace(/^https?:/, 'webcal:') : `../${team.sport}.ics`
  const name = encodeURIComponent(`${team.name} · ${siteName}`)
  const secondary = https
    ? `<a class="btn-secondary" href="${esc(webcal)}">Apple</a>
      <a class="btn-secondary" href="https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}">Google</a>
      <a class="btn-secondary" href="https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(https)}&amp;name=${name}">Outlook</a>`
    : `<a class="btn-secondary" href="${esc(webcal)}">Calendar file</a>`
  return `    <div class="subscribe" id="subscribe">
      <a class="btn-primary" href="${esc(webcal)}">Add to my calendar</a>
      <div class="apps">
      ${secondary}
      </div>
${
  https
    ? `      <div class="paste">
        <label for="feed-url">Or paste into any calendar app</label>
        <div class="paste-row"><input id="feed-url" type="text" readonly value="${esc(https)}"><button class="btn-secondary" type="button" data-copy="feed-url">Copy</button></div>
      </div>
`
    : ''
}      <p class="small">Free. Updated daily from ${federation(team)}. Leave any time by deleting the calendar. ${GOOGLE_NOTE}</p>
    </div>`
}

function nextGameCard(team: Team, game?: Game): string {
  if (!game) {
    return `  <div class="card">
    <div class="card-stripe"></div>
    <div class="card-body">
      <p class="card-meta"><span>Next game</span></p>
      <p class="card-title">No games announced yet.</p>
      <p class="card-foot">Subscribe now and new games land in your calendar as soon as ${federation(team)} announces them.</p>
    </div>
  </div>`
  }
  return `  <div class="card">
    <div class="card-stripe"></div>
    <div class="card-body">
      <p class="card-meta"><span>Next game</span><span>${esc(game.competition)}</span></p>
      <p class="card-title">${matchTitle(game)}</p>
      <ul class="facts">
        <li>${ICON.date}<span class="num">${when(game, 'long')}</span></li>
        <li>${ICON.place}<span>${esc(place(game))}</span></li>
        ${game.tv ? `<li>${ICON.tv}<span>${esc(game.tv)}</span></li>` : ''}
        ${game.tickets ? `<li>${ICON.ticket}<a href="${esc(game.tickets)}">Tickets</a></li>` : ''}
        ${game.note ? `<li><span>${esc(game.note)}</span></li>` : ''}
      </ul>
      <p class="card-foot">In your calendar it shows in your own time zone. We nudge you an hour before kickoff.</p>
    </div>
  </div>`
}

function renderRow(game: Game): string {
  const day = new Date(game.kickoff && game.utcOffsetHours !== undefined ? shift(game) : game.kickoff ?? game.date)
  const meta = [game.competition, place(game), game.tv].filter(Boolean).map((s) => esc(s!)).join(' · ')
  return `<li class="row">
  <div class="row-date"><span class="row-day">${DAY_MONTH.format(day)}</span><span class="row-time num">${when(game, 'short')}</span></div>
  <div class="row-main"><span class="row-title">${matchTitle(game)}</span><span class="row-meta">${meta}</span>${game.note ? `<span class="row-meta">${esc(game.note)}</span>` : ''}</div>
  ${game.tickets ? `<a class="row-tickets" href="${esc(game.tickets)}">Tickets</a>` : ''}
</li>`
}

function teamChip(team: Team, current: boolean): string {
  return `      <a class="team-chip" href="../../${team.country}/${team.sport}/" style="${stripeVars(team.colours)}"${current ? ' aria-current="page"' : ''}><span class="team-stripe"></span>${esc(team.name)}</a>`
}

function teamCard({ team, games }: Section): string {
  const next = games[0]
  return `  <a class="card" href="${team.country}/${team.sport}/" style="${stripeVars(team.colours)}">
    <div class="card-stripe"></div>
    <div class="card-body">
      <p class="card-meta"><span>${esc(teamKind(team))}</span><span>From ${federation(team)}</span></p>
      <p class="card-title">${esc(team.name)}</p>
      <p>${next ? `Next: ${matchTitle(next)}<br><span class="num">${when(next, 'long')}</span>` : 'No games announced yet.'}</p>
      <span class="card-cta">See the games and subscribe</span>
    </div>
  </a>`
}

const matchTitle = (game: Game) => `${esc(game.home)} vs ${esc(game.away)}`
const place = (game: Game) => [game.venue, game.city].filter(Boolean).join(', ') || 'Venue not announced'
export const federation = (team: Team) => team.source.kind.toUpperCase()
// "UEFA and FIBA", "football, basketball and handball".
const and = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)
// "UEFA and FIBA": every source behind a list of teams, once each, in the teams' order.
export const federations = (teams: Team[]) => and([...new Set(teams.map(federation))])
const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
// "National team · Men's football": the eyebrow over a team's name on its page, card and share image.
export const teamKind = (team: Team) => `National team · ${capitalise(`men's ${team.sport}`)}`
// "National teams · Football and basketball": the same over the landing page's share image.
export const landingKind = (teams: Team[]) => `National teams · ${capitalise(and([...new Set(teams.map((team) => team.sport))]))}`

// The kickoff as a clock at the venue reads it.
const shift = (game: Game) => new Date(new Date(game.kickoff!).getTime() + game.utcOffsetHours! * 60 * 60 * 1000)

// Venue time with the city, so "20:45 in Amsterdam" cannot be mistaken for the reader's own time.
// The caller picks how the date part reads; the time part is the clock at the venue with its
// city, the UTC time when the venue's offset is unknown, or "time not announced".
export function kickoffText(game: Game, date: (d: Date) => string): string {
  if (!game.kickoff) return `${date(new Date(game.date))} · time not announced`
  const kickoff = new Date(game.kickoff)
  if (game.utcOffsetHours === undefined) return `${date(kickoff)} · ${TIME.format(kickoff)} UTC`
  const local = shift(game)
  return `${date(local)} · ${TIME.format(local)} ${game.city ? `in ${game.city}` : 'at the venue'}`
}

// Same, marked up so the page's script can add the reader's own time when their zone differs.
// "long" carries the full date, "short" only the weekday, for rows that show the date beside it.
function when(game: Game, length: 'long' | 'short'): string {
  const text = esc(kickoffText(game, length === 'long' ? longDate : WEEKDAY.format))
  if (!game.kickoff) return text
  const offset = game.utcOffsetHours === undefined ? '' : ` data-offset="${game.utcOffsetHours}"`
  return `<time datetime="${esc(game.kickoff)}"${offset}>${text}</time>`
}

// Hard-stop stripes per docs/brand.md: 18 px per colour in a card header, 24 px in the page band,
// 5 px in a chip's pill.
function stripeVars(colours: string[]): string {
  const stripe = (width: number) =>
    `repeating-linear-gradient(90deg, ${colours.map((c, i) => `${c} ${i * width}px ${(i + 1) * width}px`).join(', ')})`
  return `--stripe: ${stripe(18)}; --stripe-wide: ${stripe(24)}; --stripe-pill: ${stripe(5)}`
}

function inTheFeed(count: number): string {
  if (count === 1) return 'Already in the feed'
  if (count === 2) return 'Both are already in the feed'
  return `All ${count} are already in the feed`
}

function mark(size: number): string {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" aria-hidden="true"><g transform="rotate(-14 32 32)"><rect x="8" y="22" width="48" height="20" rx="7" fill="#D7263D"/><rect x="17" y="22" width="7" height="20" fill="#FBF8F2"/><rect x="29" y="22" width="7" height="20" fill="#FBF8F2"/><rect x="41" y="22" width="7" height="20" fill="#FBF8F2"/><rect x="8" y="22" width="48" height="20" rx="7" stroke="#17171C" stroke-width="3"/><path d="M8 27H2M8 32H2M8 37H2M56 27h6M56 32h6M56 37h6" stroke="#17171C" stroke-width="3" stroke-linecap="round"/></g></svg>`
}

const icon = (paths: string) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
const ICON = {
  date: icon('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  place: icon('<path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>'),
  tv: icon('<rect x="2" y="7" width="20" height="13" rx="2"/><path d="M8 3l4 4 4-4"/>'),
  ticket: icon('<path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4V7z"/><path d="M10 7v10" stroke-dasharray="2 2"/>'),
}

function esc(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
