import { appendFile, cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { setTimeout as pause } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'
import { feedChanges } from './changes.ts'
import { alertsFeedPath, countrySharePath, feedPath, landingSharePath, sharePath, teams, type Team } from './config.ts'
import { fetchFibaPage, parseFibaGames } from './fiba.ts'
import { flagFile, flagLicenseFile, flagPath } from './flags.ts'
import { byStart, withDetails, type Game } from './game.ts'
import { toIcs } from './ics.ts'
import { announced, recordSeen, type KnownGames } from './known-games.ts'
import { manual } from './manual.ts'
import { renderCountryPage, renderHowItWorks, renderKit, renderLanding, renderTeamPage, type Section } from './page.ts'
import { renderCountryShareImage, renderLandingShareImage, renderShareImage } from './share.ts'
import { fetchUefaMatches, parseUefaMatches } from './uefa.ts'

// Fetches every team's upcoming games and writes one calendar feed, one page and one share image
// per team, the landing page with its own share image, How it works at /how-it-works/, the
// unlisted identity kit at /kit/, and
// next to them the brand assets (stylesheets, icons) and the flags the teams use, copied out of
// flag-icons with its licence.
// Each country gets a page and a share image of its own too, listing its teams.
// Requests stay minimal: UEFA answers for every football team in one call, and a FIBA page is
// fetched once per competition and shared by the teams playing in it (Greece and Spain are in
// the same qualifiers). A build on a push to main asks neither again while an earlier build's
// answers are less than a day old (answers/, below). Any failure aborts the whole build, so the
// previously published files stay in place.
// With --fixtures (npm run build:fixtures) it builds the same site from the sources' answers saved
// in test/fixtures/ and makes no request at all: none to the sources, none to the live feeds.

const fixtures = process.argv.includes('--fixtures')
// A fixture build is dated on the day the newer fixture was saved, so the fixtures' games stay upcoming.
const now = fixtures ? new Date('2026-10-17') : new Date()
const today = now.toISOString().slice(0, 10)
const siteUrl = process.env.SITE_URL?.replace(/\/$/, '')

// A file kept between runs that is not there yet (the first build, or a lost cache) reads as {}.
const orNone = (error: NodeJS.ErrnoException) => {
  if (error.code === 'ENOENT') return '{}'
  throw error
}

// The games earlier builds saw, so this one can tell a newly announced game from an old one for
// the -alerts feeds. Not in git: the Actions job keeps it in its cache (.github/workflows/publish.yml).
// Missing on the first build, or once the cache is lost, which seeds it again and announces nothing.
// A fixture build starts from none and saves none, so the developer's own file stays as it was.
const KNOWN_GAMES = 'known-games.json'
const known: KnownGames = fixtures ? {} : JSON.parse(await readFile(KNOWN_GAMES, 'utf8').catch(orNone))

// Where a source's answer comes from: fetched, or in a fixture build read from that file in test/fixtures/.
const saved = (file: string) => (fixtures ? new URL(`../test/fixtures/${file}`, import.meta.url) : undefined)

// Every build but a fixture build saves the answers it fetched in answers/, and answers/log.json says
// when each was fetched and which football teams UEFA's asked for. The Actions job keeps the folder in
// its cache, like known-games.json. A build on a push to main, often a docs-only merge, reads a saved
// answer instead of asking again while it is less than a day old and covers the teams (#99): a team id
// UEFA's answer lacks costs one fresh call for every team, a FIBA competition with no saved page costs
// that page. Every other build asks afresh: the daily one, a manual run, a local build. A saved answer
// is read and checked exactly like a fetched one, so a broken one fails the build too.
const ANSWERS = 'answers'
const log: Record<string, { fetched: string; teamIds?: number[] }> =
  !fixtures && process.env.GITHUB_EVENT_NAME === 'push' ? JSON.parse(await readFile(`${ANSWERS}/log.json`, 'utf8').catch(orNone)) : {}
const reusable = (file: string, teamIds: number[] = []): URL | undefined => {
  const entry = log[file]
  if (!entry) return undefined
  const age = now.getTime() - Date.parse(entry.fetched)
  // A time ahead of the clock proves nothing about the answer's age, so it is asked again.
  const fresh = age >= 0 && age < 24 * 60 * 60 * 1000
  return fresh && teamIds.every((id) => entry.teamIds?.includes(id)) ? pathToFileURL(`${ANSWERS}/${file}`) : undefined
}
const asked = new Map<string, string>() // what this build fetched, by file in answers/, saved at the end
const keep = (file: string, answer: string, teamIds?: number[]) => {
  asked.set(file, answer)
  log[file] = { fetched: now.toISOString(), teamIds }
}

const UEFA = 'uefa-matches.json'
const uefaTeamIds = teams.flatMap(({ source }) => (source.kind === 'uefa' ? [source.teamId] : []))
const uefaFrom = saved(UEFA) ?? reusable(UEFA, uefaTeamIds)
const uefaMatches = uefaTeamIds.length ? await fetchUefaMatches(uefaTeamIds, today, uefaFrom) : []
if (uefaTeamIds.length && !uefaFrom) keep(UEFA, JSON.stringify(uefaMatches), uefaTeamIds)
const fibaPages = new Map<string, string>()

for (const event of new Set(teams.flatMap(({ source }) => (source.kind === 'fiba' ? [source.event] : [])))) {
  const file = `fiba-${event}.html`
  // shortcut: one fixture page answers for every FIBA competition; give each its own file once there are two.
  const from = saved('fiba-games.html') ?? reusable(file)
  if (!from && fibaPages.size > 0) await pause(5000) // a breath between two pages of the same site
  const page = await fetchFibaPage(event, from)
  fibaPages.set(event, page)
  if (!from) keep(file, page)
}

const gamesOf = ({ source }: Team): Game[] =>
  source.kind === 'uefa' ? parseUefaMatches(uefaMatches, source.teamId) : parseFibaGames(fibaPages.get(source.event)!, source.teamCode)

// The feed fans have now, to tell what this build changes (src/changes.ts). Our own site, not a
// source, so it does not count against the one-request-per-source rule.
async function liveFeed(team: Team): Promise<string> {
  const response = await fetch(`${siteUrl}/${feedPath(team)}`, { signal: AbortSignal.timeout(10_000) })
  if (!response.ok) throw new Error(`answered ${response.status}`)
  return response.text()
}

const sections: Section[] = []
const changes: string[] = [] // a Markdown block per team whose feed changed, for the run summary
for (const team of teams) {
  const games = gamesOf(team)
    .filter((game) => game.date >= today)
    .map((game) => withDetails(game, team.defaults, manual[game.id]))
    .sort(byStart)
  const key = `${team.country}/${team.sport}`
  const seen = recordSeen(known[key], games.map((game) => game.id), today)
  known[key] = seen.feed
  await mkdir(`dist/${team.country}/${team.sport}`, { recursive: true })
  const ics = toIcs(team, games, now, siteUrl)
  await writeFile(`dist/${feedPath(team)}`, ics)
  await writeFile(`dist/${alertsFeedPath(team)}`, toIcs(team, games, now, siteUrl, announced(seen.feed)))
  sections.push({ team, games })
  console.log(`${team.name}: ${games.length} upcoming games, ${seen.fresh.length} new`)
  if (siteUrl && !fixtures) {
    const lines = await liveFeed(team).then(
      (live) => feedChanges(live, ics, today),
      (error: Error) => [`Couldn't read the live feed: ${error.message}`],
    )
    if (lines.length) changes.push(`**${team.name}**`, ...lines.map((line) => `- ${line}`), '')
  }
}
for (const section of sections) {
  const { team, games } = section
  await writeFile(`dist/${team.country}/${team.sport}/index.html`, renderTeamPage(section, teams, siteUrl))
  await writeFile(`dist/${sharePath(team)}`, await renderShareImage(team, games[0], siteUrl))
}
for (const country of new Set(teams.map((team) => team.country))) {
  const group = sections.filter((section) => section.team.country === country)
  await writeFile(`dist/${country}/index.html`, renderCountryPage(group, siteUrl))
  await writeFile(`dist/${countrySharePath(group[0]!.team)}`, await renderCountryShareImage(group.map((section) => section.team), siteUrl))
}
await writeFile('dist/index.html', renderLanding(sections, siteUrl))
await writeFile(`dist/${landingSharePath}`, await renderLandingShareImage(teams, siteUrl))
await mkdir('dist/how-it-works', { recursive: true })
await writeFile('dist/how-it-works/index.html', renderHowItWorks(sections, siteUrl))
await mkdir('dist/kit', { recursive: true })
await writeFile('dist/kit/index.html', renderKit(teams))
await cp(new URL('../assets', import.meta.url), 'dist', { recursive: true }) // found from any working folder
// Only the flags a team uses, never the whole package; the licence sits next to the copies, as
// MIT asks. Every flag was already read for its share image, so a wrong code failed before this.
for (const code of new Set(teams.map((team) => team.flag))) await cp(flagFile(code), `dist/${flagPath(code)}`)
await cp(flagLicenseFile(), 'dist/flags/LICENSE')
// On the run's page in Actions (GITHUB_STEP_SUMMARY), printed elsewhere. A local build has no
// SITE_URL, so nothing to compare with and no summary; nor has a fixture build, whatever its SITE_URL.
if (siteUrl && !fixtures) {
  const pages = (n: number) => `${n} competition ${n === 1 ? 'page' : 'pages'}`
  const fibaAsked = [...asked.keys()].filter((file) => file !== UEFA).length
  const sources = [
    uefaTeamIds.length &&
      `${asked.has(UEFA) ? 'UEFA answered one request' : "UEFA's saved answer reused"} for ${uefaTeamIds.length} football teams`,
    fibaAsked && `FIBA answered ${pages(fibaAsked)}`,
    fibaPages.size > fibaAsked && `FIBA's saved answer reused for ${pages(fibaPages.size - fibaAsked)}`,
  ].filter(Boolean)
  const counts = sections.map(({ team, games }) => `${team.name} ${games.length}`).join(' · ')
  const report = [
    '## What this build changed',
    '',
    `${sources.join(' · ')}. Upcoming games: ${counts}.`,
    '',
    ...(changes.length ? changes : ['No game changed in any feed.']),
  ]
  const summaryFile = process.env.GITHUB_STEP_SUMMARY
  if (summaryFile) await appendFile(summaryFile, report.join('\n') + '\n')
  else console.log(report.join('\n'))
}
// Last, so a build that fails part-way leaves the files as they were; the job caches them after the deploy.
if (!fixtures) {
  await writeFile(KNOWN_GAMES, JSON.stringify(known, null, 2) + '\n')
  await mkdir(ANSWERS, { recursive: true })
  for (const [file, answer] of asked) await writeFile(`${ANSWERS}/${file}`, answer)
  await writeFile(`${ANSWERS}/log.json`, JSON.stringify(log, null, 2) + '\n')
}
